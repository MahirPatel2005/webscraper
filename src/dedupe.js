const fs = require('fs');
const path = require('path');
const config = require('./config');

const FILE = config.paths.processedFile;

function ensureFile() {
  const dir = path.dirname(FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify({}, null, 2));
}

function loadProcessed() {
  ensureFile();
  try {
    const raw = fs.readFileSync(FILE, 'utf-8');
    return JSON.parse(raw || '{}');
  } catch (err) {
    // Corrupt or unreadable file — start fresh rather than crash the service
    return {};
  }
}

function saveProcessed(map) {
  ensureFile();
  fs.writeFileSync(FILE, JSON.stringify(map, null, 2));
}

function saveListingsJson(next) {
  const listingsPath = config.paths.listingsFile;
  const dir = path.dirname(listingsPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const listingsArray = Object.entries(next).map(([id, entry]) => {
    let parsedData = {};
    try {
      parsedData = typeof entry.data === 'string' ? JSON.parse(entry.data) : (entry.data || {});
    } catch (e) {
      // fallback
    }
    return {
      ...parsedData,
      ...(entry.overrides || {}),
      id,
      status: entry.status,
      lastSeen: entry.lastSeen,
      delistedAt: entry.delistedAt || null,
      disabled: entry.disabled || false,
      featured: entry.featured || false,
      custom: entry.custom || false,
    };
  });

  fs.writeFileSync(listingsPath, JSON.stringify(listingsArray, null, 2));
}

/**
 * Diffs the freshly scraped listing IDs against what we saw last run.
 * Does NOT save the state yet.
 *
 * Returns:
 *  - newIds: present now, not seen before
 *  - changedIds: present now, seen before, but data differs (e.g. price changed)
 *  - unchangedIds: present now, identical to last time
 *  - missingIds: seen before, NOT present now (likely delisted/sold)
 */
function diff(currentRecordsById, anyPageFailed = false) {
  const previous = loadProcessed();

  const newIds = [];
  const changedIds = [];
  const unchangedIds = [];

  for (const [id, record] of Object.entries(currentRecordsById)) {
    const serialized = JSON.stringify(record);
    const prevEntry = previous[id];

    if (!prevEntry) {
      newIds.push(id);
    } else if (prevEntry.data !== serialized) {
      changedIds.push(id);
    } else {
      unchangedIds.push(id);
    }
  }

  const missingIds = [];
  for (const [id, entry] of Object.entries(previous)) {
    if (!(id in currentRecordsById) && entry.status !== 'delisted' && !entry.custom) {
      if (!anyPageFailed) {
        missingIds.push(id);
      }
    }
  }

  return { newIds, changedIds, unchangedIds, missingIds };
}

/**
 * Saves the final processed state of all listings.
 * Excludes any IDs that failed to sync to Wix from being updated in the local cache,
 * ensuring they will be retried on the next run.
 */
function save(currentRecordsById, failedIds, anyPageFailed = false) {
  const previous = loadProcessed();
  const now = new Date().toISOString();
  const next = {};

  // Process current records
  for (const [id, record] of Object.entries(currentRecordsById)) {
    const serialized = JSON.stringify(record);
    const prevEntry = previous[id];

    if (failedIds.has(id)) {
      // If it failed to sync, keep the previous cache state (so it is treated as new/changed next time)
      if (prevEntry) {
        next[id] = prevEntry;
      }
      // If it was a brand new item and failed, we don't write it to 'next' at all
    } else {
      // Successfully synced (or unchanged)
      // Carry forward existing flags/overrides if it was scraped again
      const disabled = prevEntry ? (prevEntry.disabled || false) : false;
      const featured = prevEntry ? (prevEntry.featured || false) : false;
      const custom = prevEntry ? (prevEntry.custom || false) : false;
      const overrides = prevEntry ? (prevEntry.overrides || {}) : {};

      next[id] = {
        data: serialized,
        status: 'active',
        lastSeen: now,
        disabled,
        featured,
        custom,
        overrides,
      };
    }
  }

  // Process missing/delisted records
  for (const [id, entry] of Object.entries(previous)) {
    if (!(id in currentRecordsById)) {
      if (failedIds.has(id)) {
        // Failed to mark as delisted, keep as active (retry next time)
        next[id] = entry;
      } else if (entry.custom) {
        // Custom items added by admin should ALWAYS remain active and not be delisted
        next[id] = { ...entry, status: 'active', lastSeen: now };
      } else if (entry.status !== 'delisted') {
        if (anyPageFailed) {
          next[id] = entry; // Keep active because scrape was incomplete
        } else {
          next[id] = { ...entry, status: 'delisted', delistedAt: now };
        }
      } else {
        // Already delisted, carry forward
        next[id] = entry;
      }
    }
  }

  saveProcessed(next);
  saveListingsJson(next);
}

module.exports = { diff, save, loadProcessed, saveProcessed, saveListingsJson };
