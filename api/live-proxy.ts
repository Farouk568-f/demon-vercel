export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "*",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const urlObj = new URL(req.url);
  const targetUrl = urlObj.searchParams.get("url");

  if (!targetUrl) {
    return new Response("Missing url parameter", { status: 400, headers: corsHeaders });
  }

  try {
    console.log(`[Live Proxy Edge] Fetching stream: ${targetUrl}`);
    
    const requestHeaders = new Headers();
    requestHeaders.set(
      "User-Agent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
    );
    
    const rangeHeader = req.headers.get("range");
    if (rangeHeader) {
      requestHeaders.set("Range", rangeHeader);
    }

    const response = await fetch(targetUrl, {
      headers: requestHeaders,
      redirect: "follow",
    });

    const newHeaders = new Headers();
    for (const [key, value] of Object.entries(corsHeaders)) {
      newHeaders.set(key, value);
    }

    // Set streaming and buffering headers to bypass any intermediate buffering layers
    newHeaders.set("X-Accel-Buffering", "no");
    newHeaders.set("Cache-Control", "no-cache, no-transform");
    newHeaders.set("Connection", "keep-alive");

    // Copy essential media headers from remote response
    const copyHeaders = ["content-type", "content-length", "content-range", "accept-ranges"];
    for (const headerName of copyHeaders) {
      const val = response.headers.get(headerName);
      if (val) {
        newHeaders.set(headerName, val);
      }
    }

    // Default for MPEG-TS stream if content-type is missing/generic
    if (!newHeaders.get("content-type") || newHeaders.get("content-type") === "application/octet-stream") {
      newHeaders.set("content-type", "video/mp2t");
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  } catch (error: any) {
    console.error("[Live Proxy Edge] Error:", error.message);
    return new Response(`Proxy error: ${error.message}`, {
      status: 500,
      headers: corsHeaders,
    });
  }
}
