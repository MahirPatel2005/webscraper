# Deployment Guide

This guide explains how to deploy the React property listings app and configure the daily web scraper automation for free.

---

## Part 1: Deploying the React Frontend (Vercel or Netlify)

Vercel and Netlify are completely free static hosting platforms that integrate directly with your GitHub repository.

### Option A: Hosting on Vercel (Recommended)

1. Sign up or log into [Vercel](https://vercel.com) using your GitHub account.
2. Click **Add New** > **Project**.
3. Select your repository: `webscraper` and click **Import**.
4. In the **Configure Project** settings, modify the following fields:
   - **Framework Preset**: Select **Vite** (should be auto-detected).
   - **Root Directory**: Click *Edit* and select the `frontend` folder.
   - **Build & Development Settings**: Keep defaults (`Build Command: npm run build`, `Output Directory: dist`).
5. Click **Deploy**.
6. Once deployed, Vercel will give you a live URL (e.g. `https://webscraper.vercel.app`). Any time the GitHub repository gets updated, Vercel will rebuild and deploy the new listings automatically.

---

### Option B: Hosting on Netlify

1. Sign up or log into [Netlify](https://netlify.com) using your GitHub account.
2. Click **Add new site** > **Import an existing project**.
3. Choose **GitHub** and select your repository: `webscraper`.
4. In the **Build settings** section, configure:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist` (resolves relative to base as `frontend/dist`)
5. Click **Deploy webscraper**.

---

## Part 2: Automated Scraper Configuration (GitHub Actions)

Your repository now contains a workflow (`.github/workflows/scrape.yml`) that automatically runs the web scraper every day at 3:00 AM UTC.

### How to trigger a manual run:
1. Navigate to your repository page on GitHub.
2. Click on the **Actions** tab at the top.
3. Select the **Daily Property Scraper** workflow on the left sidebar.
4. Click the **Run workflow** dropdown on the right side and click the green **Run workflow** button.
5. Once completed, it will commit any updated property data back to `main`, which automatically triggers a new Vercel/Netlify redeployment.
