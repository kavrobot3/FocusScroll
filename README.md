# FocusScroll

FocusScroll is a distraction-free, attention-training video feed application built with React, Vite, and Tailwind CSS.

## Architecture & Deployment

- **No Backend**: This prototype runs strictly client-side on the frontend. No backend server or serverless functions are required.
- **Frontend YouTube API Integration**: Calls the YouTube Data API v3 directly from the browser using `fetch()`.
- **Security & Key Restriction**: For production deployment, restrict your `VITE_YOUTUBE_API_KEY` in the Google Cloud Console using **HTTP Referrer Restrictions** (e.g. `*.pages.dev/*` or your custom domain) and **API Restrictions** (YouTube Data API v3 only).
- **Quota Safety**: A low daily quota cap is configured in Google Cloud Console as a safety measure. Local client-side caching (6-hour expiry) is enabled to preserve quota.

## Deployment Instructions (Static Hosting / Cloudflare Pages / Vercel / Netlify)

1. Push repo to GitHub.
2. Connect repo to static host (Cloudflare Pages, Vercel, Netlify, etc.).
3. Set build configuration:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Set Environment Variable:
   - **Key**: `VITE_YOUTUBE_API_KEY`
   - **Value**: Your YouTube Data API v3 key
5. Deploy the application.

## Local Development Instructions

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Add your YouTube Data API key to `.env`:
   ```env
   VITE_YOUTUBE_API_KEY=your_key_here
   ```
3. Start dev server:
   ```bash
   npm run dev
   ```
