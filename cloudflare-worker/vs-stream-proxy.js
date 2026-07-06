// ============================================================
// VS Stream Proxy — Cloudflare Worker
// ============================================================
// Carries the HEAVY video segment traffic for the vidsrc/TMDB provider so the
// main app server never touches video bytes (its bandwidth drops to ~0).
//
// Why a worker is required (and why the browser can't hit the CDN directly):
// the upstream video CDN returns 403 for ANY request that carries a browser
// `Origin` header (tested: vercel.app, localhost, even `null` are all
// rejected). Browsers always attach `Origin` on cross-origin media requests,
// so a server-side hop is mandatory. This worker is that hop — it runs on
// Cloudflare's global edge, streams the bytes, and caches each segment so
// concurrent viewers are served from cache without touching upstream again.
//
// Deploy (free plan is enough):
//   1. npm install -g wrangler
//   2. wrangler login
//   3. cd cloudflare-worker && wrangler deploy
//   4. Copy the printed URL (e.g. https://vs-stream-proxy.YOURNAME.workers.dev)
//      and set it as the VS_STREAM_PROXY environment variable on the main app
//      (Vercel dashboard -> Settings -> Environment Variables), then redeploy.
//
// If VS_STREAM_PROXY is not set, the app keeps proxying segments itself —
// this worker is a pure, optional upgrade.
// ============================================================

const UPSTREAM_REFERER = "https://cloudorchestranova.com/";
const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Expose-Headers": "*",
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight (hls.js normally sends none for plain GETs, but be safe)
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname !== "/ts") {
      return new Response("vs-stream-proxy: use /ts?url=...", {
        status: url.pathname === "/" ? 200 : 404,
        headers: CORS_HEADERS,
      });
    }

    const target = url.searchParams.get("url");
    if (!target || !/^https:\/\//i.test(target)) {
      return new Response("Missing or invalid url", { status: 400, headers: CORS_HEADERS });
    }

    // ---- Edge cache: identical segment URLs (tokens are stripped upstream by
    // the app) mean every viewer after the first hits Cloudflare's cache.
    const cache = caches.default;
    const cacheKey = new Request(`${url.origin}/ts?url=${encodeURIComponent(target)}`);
    const hit = await cache.match(cacheKey);
    if (hit) {
      const res = new Response(hit.body, hit);
      for (const [k, v] of Object.entries(CORS_HEADERS)) res.headers.set(k, v);
      res.headers.set("X-VS-Cache", "HIT");
      return res;
    }

    // ---- Fetch upstream WITHOUT any Origin header (server-side request)
    let upstream = null;
    try {
      upstream = await fetch(target, {
        headers: {
          "User-Agent": request.headers.get("User-Agent") || DEFAULT_UA,
          Referer: UPSTREAM_REFERER,
          ...(request.headers.get("Range") ? { Range: request.headers.get("Range") } : {}),
        },
        redirect: "follow",
        cf: { cacheTtl: 86400, cacheEverything: true },
      });
    } catch (e) {
      upstream = null;
    }

    if (!upstream || !upstream.ok) {
      // Fall back to the main app's own segment proxy, which has the full
      // token + self-heal logic (fb = fallback origin, x = heal context).
      //
      // IMPORTANT: we must NOT use a 302 redirect here. A redirect response
      // carries no CORS headers, so browsers block it (net::ERR_FAILED 302)
      // and playback dies for any title whose CDN rejects the worker.
      // Instead the worker fetches the fallback itself and streams it back
      // with full CORS headers — invisible to the browser.
      const fb = url.searchParams.get("fb");
      if (fb && /^https?:\/\//i.test(fb)) {
        const x = url.searchParams.get("x");
        const fallback = `${fb.replace(/\/+$/, "")}/api/vs-proxy/ts?url=${encodeURIComponent(target)}${x ? `&x=${encodeURIComponent(x)}` : ""}`;
        try {
          const healed = await fetch(fallback, {
            headers: {
              "User-Agent": request.headers.get("User-Agent") || DEFAULT_UA,
              ...(request.headers.get("Range") ? { Range: request.headers.get("Range") } : {}),
            },
            redirect: "follow",
          });
          if (healed.ok) {
            const h = new Headers(CORS_HEADERS);
            h.set("Content-Type", healed.headers.get("Content-Type") || "video/mp2t");
            h.set("Cache-Control", "public, max-age=3600, s-maxage=86400, immutable");
            h.set("X-VS-Fallback", "1");
            const res = new Response(healed.body, { status: 200, headers: h });
            // Cache the healed segment too, so the next viewers of this
            // segment are served from the edge without hitting the app.
            if (request.method === "GET" && !request.headers.get("Range")) {
              try {
                ctx.waitUntil(cache.put(cacheKey, res.clone()));
              } catch (e) {
                /* body too large for cache — still streamed to the viewer */
              }
            }
            return res;
          }
        } catch (e) {
          /* fallback unreachable — fall through to the 502 below */
        }
      }
      return new Response(`Upstream error ${upstream ? upstream.status : "network"}`, {
        status: 502,
        headers: CORS_HEADERS,
      });
    }

    const headers = new Headers(CORS_HEADERS);
    headers.set("Content-Type", "video/mp2t");
    headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400, immutable");
    const len = upstream.headers.get("Content-Length");
    if (len) headers.set("Content-Length", len);

    const response = new Response(upstream.body, { status: 200, headers });

    // Cache the segment at this edge location for the next viewers (segments
    // are immutable). tee() lets us stream to the user and the cache at once.
    if (request.method === "GET" && !request.headers.get("Range")) {
      try {
        ctx.waitUntil(cache.put(cacheKey, response.clone()));
      } catch (e) {
        /* body too large for cache — still streamed to the viewer */
      }
    }

    return response;
  },
};
