# Practix — Cloudflare Pages Deployment Guide

Practix is built as a zero-backend, statically optimized client-side application specifically engineered for fast, global deployment on **Cloudflare Pages**.

---

## 1. Build Specifications

- **Framework**: Vite + Vanilla TypeScript + Custom CSS
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Node Version**: `>= 18` (Recommended: `20.x` or `24.x LTS`)

---

## 2. Cloudflare Pages Configuration

A standard `wrangler.toml` file is located at the root of the project:

```toml
name = "practix-game-suite"
compatibility_date = "2026-10-25"
pages_build_output_dir = "dist"
```

### Static Headers (`public/_headers`)
To ensure optimal caching, PWA readiness, and security headers:

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: interest-cohort=()
  Cache-Control: public, max-age=3600

/assets/*
  Cache-Control: public, max-age=31536000, immutable
```

---

## 3. Deployment Methods

### Option A: Direct Git Integration (Automated CI/CD)
1. Push repository changes to GitHub (`AJMAL-KP/Practix`).
2. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
3. Select repository `Practix`.
4. Build settings:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Click **Save and Deploy**. Any subsequent commit to `main` deploys automatically!

### Option B: Wrangler CLI (Direct Command-Line Deployment)
```bash
# Build production bundle
npm run build

# Deploy via Wrangler
npx wrangler pages deploy dist --project-name=practix-game-suite
```
*Note: If deploying for the first time via CLI, Wrangler will prompt for Cloudflare authentication via browser.*
