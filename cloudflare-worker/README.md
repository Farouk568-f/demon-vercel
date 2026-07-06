# VS Stream Proxy (Cloudflare Worker)

## المشكلة | The problem

مزوّد vidsrc (TMDB) يرفض أي طلب فيديو يحمل ترويسة `Origin` من المتصفح — تم اختبار ذلك فعليًا:

| Origin المرسل | النتيجة |
|---|---|
| بدون Origin (طلب من سيرفر) | ✅ 200 |
| `https://*.vercel.app` | ❌ 403 |
| `http://localhost:3000` | ❌ 403 |
| `null` (iframe معزول) | ❌ 403 |

المتصفح **يرسل دائمًا** ترويسة `Origin` عند تحميل قطع الفيديو عبر hls.js، لذلك **يستحيل** جعل المتصفح يحمّل القطع مباشرة من الـ CDN. الحل الوحيد: وسيط سيرفري — وهذا الـ Worker هو أخف وأسرع وسيط ممكن (مجاني، على شبكة Cloudflare العالمية، مع كاش للقطع).

The upstream CDN 403s any request carrying a browser `Origin` header, so direct browser→CDN streaming is impossible. This worker is the lightest possible server-side hop: it streams segments on Cloudflare's global edge and caches them, so the main app's video bandwidth drops to ~0.

## النشر | Deploy (خطة Cloudflare المجانية تكفي)

```bash
npm install -g wrangler
wrangler login
cd cloudflare-worker
wrangler deploy
```

سيطبع لك رابطًا مثل: `https://vs-stream-proxy.YOURNAME.workers.dev`

## الربط مع التطبيق | Connect to the app

1. افتح Vercel → مشروعك → **Settings → Environment Variables**
2. أضف متغيرًا جديدًا:
   - **Name:** `VS_STREAM_PROXY`
   - **Value:** `https://vs-stream-proxy.YOURNAME.workers.dev`
3. أعد النشر (Redeploy).

من الآن، ملفات الـ `.m3u8` النصية الصغيرة فقط تمر عبر سيرفرك، بينما كل قطع الفيديو الثقيلة تمر عبر الـ Worker مع كاش على حافة Cloudflare — آلاف المشاهدين في نفس الوقت دون أي حمل على سيرفرك.

إذا لم تضبط `VS_STREAM_PROXY` يبقى التطبيق يعمل كالسابق (السيرفر يمرر القطع بنفسه) — الـ Worker ترقية اختيارية.

## ملاحظات | Notes

- الحد المجاني: 100,000 طلب/يوم لكل Worker (يكفي لآلاف ساعات المشاهدة يوميًا بفضل الكاش).
- إذا فشل الـ Worker في جلب قطعة، يعيد التوجيه تلقائيًا إلى `/api/vs-proxy/ts` في تطبيقك (الذي يملك منطق التوكن والإصلاح الذاتي الكامل) — لا انقطاع أبدًا.
