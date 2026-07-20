# 99.co New Launches → Wix CMS Sync

Scrapes 99.co New Launches listings daily (`https://www.99.co/singapore/new-launches`) and syncs them into a Wix Data (CMS) collection on your site, automatically marking projects as **delisted** when they disappear or sell out.

## 1. Set up the Wix Integration

To sync listings successfully to your Wix site, follow these setup steps:

### Step A: Find your Wix Site ID
1. Go to your [Wix Dashboard](https://manage.wix.com).
2. Look at the browser URL. It will follow this pattern: `https://manage.wix.com/dashboard/<SITE_ID>/home...`
3. Copy the `<SITE_ID>` UUID string (e.g. `7c2f4ab2-522b-4a7c-b503-3d3bcbafaca4`) and add it to your `.env` as `WIX_SITE_ID`.

### Step B: Generate your Wix API Key
1. Navigate to the [Wix Developers Center](https://dev.wix.com/).
2. Select or create an app, or go to **Headless Settings** -> **API Keys**.
3. Create a new API Key with full authorization scopes for the **Wix Data / CMS** service (specifically enabling read, write, update, and delete access for data items).
4. Copy the generated token and add it to your `.env` as `WIX_API_KEY`.

### Step C: Create the Data Collection in Wix CMS
1. In your Wix Site Dashboard, navigate to **Site & App** > **CMS** (Content Manager).
2. Click **Create Collection**.
3. Set the Display Name to `Properties` (or choose another name and set `WIX_DATA_COLLECTION_ID` in your `.env` to match). 
4. Ensure the programmatic **Collection ID** (which is case-sensitive) is set exactly as `Properties` (or your custom value).
5. Add the following fields to your collection. The programmatic **Field Key** must match the table below *exactly* (case-sensitive) for the sync script to map data correctly:

| Field Name (Display) | Field Key (Programmatic) | Wix CMS Field Type | Description |
|:---|:---|:---|:---|
| **Property ID** | `propexId` | Text | Unique identifier/slug for the project (used as lookup key) |
| **Title** | `title` | Text | Development / Project title |
| **Address** | `address` | Text | Location address / District area details |
| **District** | `district` | Text | District area code (e.g. D15, D19) |
| **Property Type** | `propertyType` | Text | Type of housing (e.g. Condo, Apartment, Executive Condo) |
| **Beds** | `beds` | Number | Number of bedrooms |
| **Baths** | `baths` | Number | Number of bathrooms |
| **Floor Area Sqft** | `floorAreaSqft` | Number | Unit floor size in square feet |
| **Price** | `price` | Number | Indicative starting price |
| **PSF** | `psf` | Number | Price per square foot |
| **TOP Year** | `topYear` | Text | Expected TOP / Completion year (e.g. "2028") |
| **Tenure** | `tenure` | Text | Tenure type (e.g. Freehold, 99-year Leasehold) |
| **Total Units** | `totalUnits` | Number | Total units in the development |
| **Developer** | `developer` | Text | Project developer name |
| **Agent Name** | `agentName` | Text | Primary listing agent name |
| **Agent License** | `agentLicense` | Text | CEA agent license number |
| **Phone** | `phone` | Text | Contact phone number |
| **Listing URL** | `listingUrl` | URL | Direct link back to the listing page |
| **Image** | `image` | Image (or URL/Text) | URL of the cover photo |
| **Images** | `images` | Array (or Tags/Text) | List of additional photo URLs |
| **Agent Photo** | `agentPhoto` | Image (or URL/Text) | Agent profile picture URL |
| **Status** | `status` | Text | `active` / `delisted` |
| **Source Site** | `sourceSite` | Text | Data source identifier (e.g. `99.co`) |
| **Last Synced At** | `lastSyncedAt` | Date and Time | Timestamp of the last successful sync run |
| **Delisted At** | `delistedAt` | Date and Time | Timestamp when listing was marked delisted |

### Step D: Set Collection Permissions
1. In the CMS Content Manager, open settings for the `Properties` collection (click the 3 dots next to the collection name).
2. Go to **Permissions & Privacy**.
3. Choose the appropriate privacy settings:
   - Set **Who can read content** to **Anyone** (so frontend visitors can view the properties).
   - Set **Who can create/update/delete content** to **Admin** (since headless API requests using your API key authenticate with Admin-level privileges).

On your website pages, filter and display only listings where `status = active`.

## 2. Install

```bash
npm install
```

## 3. Configure

Copy `.env.example` to `.env` and fill in:
- `WIX_SYNC_ENABLED` (`true` to sync with Wix CMS, `false` for local testing)
- `WIX_API_KEY`, `WIX_SITE_ID`, `WIX_DATA_COLLECTION_ID`
- `SOURCE_BASE_URL` (defaults to `https://www.99.co/singapore/new-launches`)
- `CRON_SCHEDULE` (defaults to daily at 3am: `0 3 * * *`)

## 4. Test a single run

```bash
npm run run-once
```

Check `logs/app.log` and `data/listings.json` afterward.

## 5. Deploy as a background service

```bash
npm install -g pm2
pm2 start src/scheduler.js --name 99co-wix-sync
pm2 startup
pm2 save
```
