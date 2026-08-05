# FocusScroll

FocusScroll is a distraction-free, micro-learning video feed application built with React, Vite, Tailwind CSS, and Cloudflare Pages + Cloudflare Workers.

## Cloudflare Pages Deployment Instructions

1. Push repo to GitHub
2. Go to Cloudflare Dashboard → Pages → Create a project
3. Connect GitHub repo
4. Set build command: `npm run build`
5. Set output directory: `dist`
6. After first deploy, go to:
   Pages project → Settings → Environment Variables → Secrets
7. Add secret:
   Name: `YOUTUBE_API_KEY`
   Value: your actual key
8. Redeploy
9. Test by opening:
   `your-site.pages.dev/api/videos`
   It should return JSON with `ok: true`

## Local Development Instructions

1. Create `.dev.vars` with `YOUTUBE_API_KEY=your_key`
2. Run: `npx wrangler pages dev dist --compatibility-date=2024-01-01`
   (run `npm run build` first)
