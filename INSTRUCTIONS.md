# EdgeProp Listings Scraper & Wix CMS Sync Guide

This guide details the steps to manually check and sync your property listings, and how to configure the scraper to run automatically in the background on a schedule.

---

## 1. How to Check the Listings & Scraped Data

You can check the scraped listings locally on the server or inside your Wix dashboard.

### A. Checking Local Data Files
Whenever the scraper runs, it stores/updates the listings in the `data/` directory:
- **[listings.json](file:///Users/mahir/Downloads/project/data/listings.json)**: A readable JSON array containing the aggregated listing records. You can open this file to verify listing details, parsed units sold percentages, layouts, and facilities arrays.
- **[processed.json](file:///Users/mahir/Downloads/project/data/processed.json)**: Used internally by the scraper's deduplication logic to detect which listings have changed or have been delisted since the last scrape run.

### B. Checking Scraper Logs
All details about pages fetched, cache hits/misses, and Wix integration transactions are written to:
- **[app.log](file:///Users/mahir/Downloads/project/logs/app.log)**: Shows real-time warnings, success records, and errors. Use this file to debug the scraper behavior.

---

## 2. How to Run a Manual Sync

To trigger a manual scan and sync all listings immediately:

1. Open your terminal in the project directory.
2. Execute the single-run script:
   ```bash
   npm run run-once
   ```
3. Watch the terminal output or monitor the log file to trace the sync process:
   ```bash
   tail -f logs/app.log
   ```

---

## 3. How to Update Listings Automatically (Background Scheduling)

To keep your listings up to date automatically without any manual intervention, you have two primary options: **PM2 Scheduler (Recommended)** or **System Cron**.

### Option A: Using the Built-in PM2 Scheduler (Recommended)
This codebase includes a background scheduler (`src/scheduler.js`) that uses the cron interval defined in your `.env` file (`CRON_SCHEDULE=0 3 * * *` which runs daily at 3:00 AM).

We use **PM2** (a Node.js production process manager) to keep this scheduler service alive forever:

1. **Install PM2 globally** (if not already installed):
   ```bash
   npm install -g pm2
   ```

2. **Start the Scheduler**:
   ```bash
   pm2 start src/scheduler.js --name "edgeprop-wix-sync"
   ```

3. **Ensure PM2 starts on system boot**:
   ```bash
   pm2 startup
   ```
   *(This command will output a command specific to your OS—copy and run that output command in your terminal to complete the configuration)*.

4. **Save the current PM2 list** to restore it after restarts:
   ```bash
   pm2 save
   ```

5. **Useful PM2 Commands**:
   - Check status: `pm2 status`
   - View real-time logs: `pm2 logs edgeprop-wix-sync`
   - Restart: `pm2 restart edgeprop-wix-sync`
   - Stop: `pm2 stop edgeprop-wix-sync`

---

### Option B: Using System-Level Crontab
If you prefer not to keep a Node.js daemon running continuously in the background, you can schedule the manual run command using your operating system's native `cron` daemon.

1. Open your crontab configuration editor:
   ```bash
   crontab -e
   ```

2. Add a cron line at the bottom to run the script once every day at 3 AM. Replace `/path/to/project` with the absolute path to your project folder:
   ```text
   0 3 * * * cd /path/to/project && /usr/local/bin/npm run run-once >> /path/to/project/logs/cron-run.log 2>&1
   ```

3. Save and close the editor. The task is now scheduled at the OS level.

---

## 4. Wix CMS Configuration Reference
To ensure all listings sync seamlessly to your Wix Content Manager without errors, create a collection named `Properties` with the exact programmatic **Field Keys** and types below:

| Wix Display Name | Field Key (System ID) | Field Type | Description / Sample Value |
| :--- | :--- | :--- | :--- |
| **Project ID** | `propexId` | Text | `lentor-gardens-residences` (Lookup / ID) |
| **Title** | `title` | Text | `Lentor Gardens Residences` |
| **Address** | `address` | Text | `D26 Singapore` |
| **District** | `district` | Text | `D26` |
| **Property Type** | `propertyType` | Text | `Condo` |
| **Beds** | `beds` | Text | `2 - 5` *(Preserves bed ranges)* |
| **Baths** | `baths` | Number | `null` or `2` |
| **Floor Area Sqft** | `floorAreaSqft` | Text | `646 - 1496` *(Preserves size ranges)* |
| **Price** | `price` | Number | starting price (e.g. `1500000`) |
| **Average PSF** | `psf` | Number | `2333` |
| **Est. Completion** | `topYear` | Text | `2029` |
| **% of Units Sold** | `unitsSoldPercent`| Number | `15.3` |
| **Tenure** | `tenure` | Text | `Freehold` or `99 years` |
| **Total Units** | `totalUnits` | Number | `499` |
| **Developer** | `developer` | Text | `Kingsford Lentor Project Pte Ltd` |
| **Listing URL** | `listingUrl` | URL | Direct link back to source listing |
| **Cover Image** | `image` | Image / URL | URL of the cover photo |
| **Gallery Images** | `images` | Media Gallery | List of gallery photos |
| **Unit Layouts** | `layouts` | JSON / Array | Unit distributions |
| **Facilities** | `facilities` | JSON / Array | List of project facilities |
| **Status** | `status` | Text | `active` / `delisted` |
| **Last Synced At** | `lastSyncedAt` | Date and Time | Timestamp of the last sync run |
