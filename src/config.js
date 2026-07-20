require('dotenv').config();
const path = require('path');

const wixEnabled = process.env.WIX_SYNC_ENABLED === 'true';

function requiredForWix(name) {
  const value = process.env[name];
  if (wixEnabled && !value) {
    throw new Error(`Missing required environment variable for Wix sync: ${name}. Set WIX_SYNC_ENABLED=false to bypass Wix sync.`);
  }
  return value || '';
}

module.exports = {
  source: {
    baseUrls: (() => {
      const rawUrl = process.env.SOURCE_BASE_URL || 'https://www.edgeprop.sg/new-launches/all-new-property-launches';
      const separator = rawUrl.includes('|') ? '|' : ',';
      return rawUrl.split(separator).map(url => url.trim()).filter(url => url.length > 0);
    })(),
    maxPages: Number(process.env.SOURCE_MAX_PAGES || 20),
  },

  cronSchedule: process.env.CRON_SCHEDULE || '0 3 * * *', // daily at 3am

  wix: {
    enabled: wixEnabled,
    apiKey: requiredForWix('WIX_API_KEY'),
    siteId: requiredForWix('WIX_SITE_ID'),
    dataCollectionId: process.env.WIX_DATA_COLLECTION_ID || 'Properties',
    accountId: process.env.WIX_ACCOUNT_ID || '',
    baseUrl: 'https://www.wixapis.com',
  },

  request: {
    timeoutMs: Number(process.env.REQUEST_TIMEOUT_MS || 120000),
    userAgent:
      process.env.USER_AGENT ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    // Delay between page requests so we don't hammer the source site
    delayBetweenPagesMs: Number(process.env.DELAY_BETWEEN_PAGES_MS || 1200),
  },

  paths: {
    processedFile: path.join(__dirname, '..', 'data', 'processed.json'),
    listingsFile: path.join(__dirname, '..', 'data', 'listings.json'),
    logFile: path.join(__dirname, '..', 'logs', 'app.log'),
  },

  logLevel: process.env.LOG_LEVEL || 'info',
};
