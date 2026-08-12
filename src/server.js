const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { loadProcessed, saveProcessed, saveListingsJson } = require('./dedupe');

const app = express();
app.use(cors());
app.use(express.json());

// Load port and authentication credentials from environment variables
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'she-real-estate-secret-key-12345';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Generate a hashed version of the default password if needed (for comparisons)
const ADMIN_PASSWORD_HASH = bcrypt.hashSync(ADMIN_PASSWORD, 10);

// Helper to verify JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// Optional Auth (doesn't fail if no token, just populates req.user)
function optionalAuthenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      // Just ignore token if invalid and proceed as guest
      return next();
    }
    req.user = user;
    next();
  });
}

// Auth: Login Endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  // Check username
  if (username !== ADMIN_USERNAME) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // Check password: match against plaintext OR bcrypt hash
  const isMatch = password === ADMIN_PASSWORD || bcrypt.compareSync(password, ADMIN_PASSWORD_HASH);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // Sign Token
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: { username } });
});

// Auth: Verify Session Endpoint
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ username: req.user.username });
});

// GET Listings (supports optional auth to see disabled items)
app.get('/api/listings', optionalAuthenticateToken, (req, res) => {
  try {
    const listingsPath = config.paths.listingsFile;
    if (!fs.existsSync(listingsPath)) {
      return res.json([]);
    }

    const raw = fs.readFileSync(listingsPath, 'utf-8');
    const listings = JSON.parse(raw || '[]');

    // If authenticated admin, return all listings.
    // Otherwise, return only active listings that are NOT disabled.
    if (req.user) {
      return res.json(listings);
    } else {
      const activeListings = listings.filter(item => !item.disabled && item.status !== 'delisted');
      return res.json(activeListings);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to read listings data' });
  }
});

// Helper to generate a URL-friendly slug/id
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')       // Replace spaces with -
    .replace(/[^\w\-]+/g, '')   // Remove all non-word chars
    .replace(/\-\-+/g, '-');    // Replace multiple - with single -
}

// POST: Create custom listing (Auth required)
app.post('/api/listings', authenticateToken, (req, res) => {
  try {
    const record = req.body;
    if (!record.title) {
      return res.status(400).json({ error: 'Property title is required' });
    }

    const id = record.id || slugify(record.title);
    const processed = loadProcessed();

    if (processed[id]) {
      return res.status(400).json({ error: `A property with ID/slug "${id}" already exists.` });
    }

    const now = new Date().toISOString();
    const dataObj = {
      title: record.title,
      address: record.address || 'Singapore',
      district: record.district || 'D11',
      propertyType: record.propertyType || 'Condo',
      beds: record.beds || null,
      baths: record.baths || null,
      floorAreaSqft: record.floorAreaSqft || null,
      price: record.price ? Number(record.price) : null,
      psf: record.psf ? Number(record.psf) : null,
      topYear: record.topYear || '',
      unitsSoldPercent: record.unitsSoldPercent !== undefined ? Number(record.unitsSoldPercent) : null,
      tenure: record.tenure || '99 years',
      totalUnits: record.totalUnits ? Number(record.totalUnits) : null,
      developer: record.developer || 'Independent Developer',
      image: record.image || '',
      images: Array.isArray(record.images) ? record.images : [],
      layouts: Array.isArray(record.layouts) ? record.layouts : [],
      facilities: Array.isArray(record.facilities) ? record.facilities : [],
      priceRanges: Array.isArray(record.priceRanges) ? record.priceRanges : [],
    };

    processed[id] = {
      data: JSON.stringify(dataObj),
      status: 'active',
      lastSeen: now,
      disabled: record.disabled || false,
      featured: record.featured || false,
      custom: true
    };

    saveProcessed(processed);
    saveListingsJson(processed);

    // Return the formatted object
    res.status(201).json({
      ...dataObj,
      id,
      status: 'active',
      lastSeen: now,
      disabled: record.disabled || false,
      featured: record.featured || false,
      custom: true
    });
  } catch (err) {
    res.status(500).json({ error: `Failed to create listing: ${err.message}` });
  }
});

// PUT: Update a listing (scraped or custom) (Auth required)
app.put('/api/listings/:id', authenticateToken, (req, res) => {
  try {
    const id = req.params.id;
    const updateFields = req.body;
    const processed = loadProcessed();

    const prevEntry = processed[id];
    if (!prevEntry) {
      return res.status(404).json({ error: `Listing with ID "${id}" not found.` });
    }

    let parsedData = {};
    try {
      parsedData = typeof prevEntry.data === 'string' ? JSON.parse(prevEntry.data) : (prevEntry.data || {});
    } catch (e) {}

    const isCustom = !!prevEntry.custom;
    const now = new Date().toISOString();

    if (isCustom) {
      // Direct update for custom listings
      const updatedData = {
        ...parsedData,
        ...updateFields
      };
      
      // Filter out meta parameters from the stored data JSON
      delete updatedData.id;
      delete updatedData.status;
      delete updatedData.lastSeen;
      delete updatedData.disabled;
      delete updatedData.featured;
      delete updatedData.custom;

      processed[id] = {
        ...prevEntry,
        data: JSON.stringify(updatedData),
        disabled: updateFields.disabled !== undefined ? !!updateFields.disabled : !!prevEntry.disabled,
        featured: updateFields.featured !== undefined ? !!updateFields.featured : !!prevEntry.featured,
        lastSeen: now,
      };
    } else {
      // Scraped listings: store changes in overrides
      const overrides = { ...(prevEntry.overrides || {}), ...updateFields };
      
      // Remove metadata keys from overrides object
      delete overrides.id;
      delete overrides.status;
      delete overrides.lastSeen;
      delete overrides.disabled;
      delete overrides.featured;
      delete overrides.custom;

      processed[id] = {
        ...prevEntry,
        overrides,
        disabled: updateFields.disabled !== undefined ? !!updateFields.disabled : !!prevEntry.disabled,
        featured: updateFields.featured !== undefined ? !!updateFields.featured : !!prevEntry.featured,
      };
    }

    saveProcessed(processed);
    saveListingsJson(processed);

    // Build merged return response
    const entry = processed[id];
    const latestData = isCustom ? JSON.parse(entry.data) : parsedData;
    const merged = {
      ...latestData,
      ...(entry.overrides || {}),
      id,
      status: entry.status,
      lastSeen: entry.lastSeen,
      delistedAt: entry.delistedAt || null,
      disabled: entry.disabled || false,
      featured: entry.featured || false,
      custom: entry.custom || false,
    };

    res.json(merged);
  } catch (err) {
    res.status(500).json({ error: `Failed to update listing: ${err.message}` });
  }
});

// DELETE: Delete a listing (Auth required)
app.delete('/api/listings/:id', authenticateToken, (req, res) => {
  try {
    const id = req.params.id;
    const processed = loadProcessed();

    if (!processed[id]) {
      return res.status(404).json({ error: `Listing with ID "${id}" not found.` });
    }

    delete processed[id];

    saveProcessed(processed);
    saveListingsJson(processed);

    res.json({ success: true, message: `Listing ${id} deleted successfully.` });
  } catch (err) {
    res.status(500).json({ error: `Failed to delete listing: ${err.message}` });
  }
});

// Serve frontend build static files in production
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  // Fallback to React index.html for routing
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('API Server Running. Please start frontend dev server or build frontend to serve UI.');
  });
}

app.listen(PORT, () => {
  console.log(`Backend API Server running at http://localhost:${PORT}`);
});
