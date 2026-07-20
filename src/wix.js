const axios = require('axios');
const config = require('./config');
const logger = require('./logger');

const client = axios.create({
  baseURL: config.wix.baseUrl,
  timeout: config.request.timeoutMs,
  headers: {
    Authorization: config.wix.apiKey,
    'wix-site-id': config.wix.siteId,
    ...(config.wix.accountId ? { 'wix-account-id': config.wix.accountId } : {}),
    'Content-Type': 'application/json',
  },
});

/**
 * Parses a range string like "2 - 4" or "646 - 1496" and returns the
 * minimum value as a Number. Falls back to null if the value is missing
 * or cannot be parsed — this keeps Wix Number fields happy even when the
 * source data only has a range string.
 */
function parseRangeMin(val) {
  if (val === null || val === undefined || val === '') return null;
  const n = parseInt(String(val).replace(/,/g, ''), 10);
  return isNaN(n) ? null : n;
}

/**
 * Maps our internal record shape to the Wix Data item fields.
 * Adjust the right-hand field keys (propexId, title, address, etc.)
 * to match the exact field keys you create in the Wix Content Manager
 * for the "Properties" collection.
 *
 * Field-type notes:
 *  - images      → Media Gallery  : each URL must be wrapped as { type, src }
 *  - topYear     → Number         : stored as string in JSON, must parseInt
 *  - beds/baths/floorAreaSqft → Number : may be range strings; we send the min
 *  - layouts     → Text           : complex objects must be JSON-stringified
 */
function toWixItem(record) {
  return {
    propexId: record.id,
    title: record.title,
    address: record.address,
    district: record.district,
    propertyType: record.propertyType,

    // Number fields — range strings are reduced to their minimum value
    beds: parseRangeMin(record.beds),
    baths: parseRangeMin(record.baths),
    floorAreaSqft: parseRangeMin(record.floorAreaSqft),
    price: record.price ? Number(record.price) : null,
    psf: record.psf ? Number(record.psf) : null,
    topYear: record.topYear ? parseInt(String(record.topYear), 10) : null,
    unitsSoldPercent:
      record.unitsSoldPercent !== undefined && record.unitsSoldPercent !== null
        ? Number(record.unitsSoldPercent)
        : null,
    totalUnits: record.totalUnits || null,

    // Text / plain fields
    tenure: record.tenure || '',
    developer: record.developer || '',
    agentName: record.agentName || '',
    agentLicense: record.agentLicense || '',
    phone: record.phone || '',
    listingUrl: record.url,
    agentPhoto: record.agentPhoto || '',

    // Cover image — plain URL in an Image/URL field
    image: record.image || '',
    // 'images' field type in Wix CMS must be: Array (Javascript/Velo section)
    // This stores the URL strings natively — no Media Gallery restrictions
    images: record.images || [],


    // 'layouts' field type in Wix CMS must be: Array (Javascript/Velo section)
    layouts: record.layouts || [],

    // 'facilities' field type in Wix CMS must be: Array (Javascript/Velo section)
    facilities: record.facilities || [],

    status: 'active',
    sourceSite: '99.co',
    lastSyncedAt: new Date().toISOString(),
  };
}

/**
 * Finds an existing Wix Data item by our external propexId (since Wix
 * generates its own internal _id, we need to query by our own key to
 * know whether to insert or update).
 */
async function findExistingItem(propexId) {
  const res = await client.post(
    `/wix-data/v2/items/query`,
    {
      dataCollectionId: config.wix.dataCollectionId,
      query: {
        filter: { propexId: { $eq: propexId } },
      },
    }
  );
  const items = res.data?.dataItems || [];
  if (!items[0]) return null;
  const raw = items[0];
  // Wix Data v2 may place _id at the top-level as '_id', as 'id', or nested
  // inside 'data._id' depending on API version / response shape.
  const _id = raw._id || raw.id || raw.data?._id;
  return _id ? { _id } : null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Inserts a new property, or updates it in place if one with the same
 * propexId already exists.
 *
 * Uses the Wix save endpoint (POST /items/save) for existing items — this
 * does a full replacement by _id with NO diff computation, so Array fields
 * (images, layouts, facilities) are always written correctly without the
 * "fieldModifications has size 0" issue that affected PATCH.
 *
 * Implements a rate-limiting delay and up to 3 retry attempts with exponential
 * backoff to handle transient Wix server errors (WDE0054) and socket resets (ECONNRESET).
 */
async function upsertProperty(record) {
  const item = toWixItem(record);
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      // Find the item first
      const existing = await findExistingItem(record.id);
      
      // Delay to respect rate limits
      await sleep(1000);

      if (existing) {
        // save = create-or-replace by _id; no diff, no fieldModifications error
        await client.post(`/wix-data/v2/items/save`, {
          dataCollectionId: config.wix.dataCollectionId,
          dataItem: { _id: existing._id, data: item },
        });
        logger.info('Saved (replaced) property in Wix', { id: record.id, title: record.title });
      } else {
        await client.post(`/wix-data/v2/items`, {
          dataCollectionId: config.wix.dataCollectionId,
          dataItem: { data: item },
        });
        logger.info('Inserted new property in Wix', { id: record.id, title: record.title });
      }

      // Delay to respect rate limits
      await sleep(1000);
      return; // Success!
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || '';
      const errDetails = err.response?.data?.details ? JSON.stringify(err.response.data.details) : '';
      logger.warn(`Attempt ${attempts}/${maxAttempts} failed to upsert property ${record.id}: ${errMsg}. Details: ${errDetails}`);

      if (attempts >= maxAttempts) {
        throw err; // Re-throw the error if all retries failed
      }

      const backoffMs = attempts * 3000;
      logger.info(`Retrying upsert for ${record.id} in ${backoffMs}ms...`);
      await sleep(backoffMs);
    }
  }
}


/**
 * Marks a property as delisted (sold/withdrawn) rather than deleting it,
 * so the front-end can show "Sold" or simply filter status=active.
 */
async function markDelisted(propexId) {
  const existing = await findExistingItem(propexId);
  if (!existing) {
    logger.warn('Tried to mark unknown property as delisted', { propexId });
    return;
  }

  await client.patch(`/wix-data/v2/items/${existing._id}`, {
    dataCollectionId: config.wix.dataCollectionId,
    dataItem: {
      data: {
        status: 'delisted',
        delistedAt: new Date().toISOString(),
      },
    },
  });
  logger.info('Marked property as delisted in Wix', { propexId });
}

module.exports = { upsertProperty, markDelisted, toWixItem };
