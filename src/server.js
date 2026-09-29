const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const config = require('./config');
const { connectDB, Listing, mongoose } = require('./db');
const { loadProcessed, saveProcessed, saveListingsJson } = require('./dedupe');

// Helper to update local JSON backup files and GitHub in background
async function pushToGithub(localPath, repoPath) {
  const token = process.env.GITHUB_PAT;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) return;

  try {
    const url = `https://api.github.com/repos/${repo}/contents/${repoPath}`;
    const content = fs.readFileSync(localPath, 'utf-8');
    const base64Content = Buffer.from(content).toString('base64');

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'NodeJS-Backend'
    };

    let sha;
    try {
      const getRes = await axios.get(url, { headers });
      sha = getRes.data?.sha;
    } catch (err) {}

    await axios.put(url, {
      message: `Admin update: ${path.basename(repoPath)}`,
      content: base64Content,
      ...(sha ? { sha } : {})
    }, { headers });

    console.log(`Successfully synced ${repoPath} to GitHub repository ${repo}!`);
  } catch (err) {
    console.error(`Failed to push ${repoPath} to GitHub:`, err.response?.data || err.message);
  }
}

// Background sync to disk files
async function syncLocalBackups() {
  try {
    const allDocs = await Listing.find({}).lean();
    const listingsPath = config.paths.listingsFile;
    const dir = path.dirname(listingsPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const formatted = allDocs.map(doc => ({
      ...doc,
      id: doc.slug || (doc._id ? doc._id.toString() : '')
    }));

    fs.writeFileSync(listingsPath, JSON.stringify(formatted, null, 2));
    pushToGithub(listingsPath, 'data/listings.json');
  } catch (e) {
    console.warn('[Sync] Warning writing local backup:', e.message);
  }
}

const app = express();
app.use(cors());
app.use(express.json());

// Load credentials
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'she-real-estate-secret-key-12345';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_PASSWORD_HASH = bcrypt.hashSync(ADMIN_PASSWORD, 10);

// Connect to MongoDB
connectDB().catch(err => {
  console.error('[Server] Critical: Failed to connect to MongoDB at startup:', err.message);
});

// Auth middleware
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

function optionalAuthenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return next();

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err) req.user = user;
    next();
  });
}

// Health check
app.get('/api/health', async (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  const count = isConnected ? await Listing.countDocuments() : 0;
  res.json({
    status: isConnected ? 'healthy' : 'degraded',
    database: {
      type: 'MongoDB',
      connected: isConnected,
      name: mongoose.connection.name,
      totalListings: count
    },
    timestamp: new Date().toISOString()
  });
});

// Auth: Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (username !== ADMIN_USERNAME) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const isMatch = password === ADMIN_PASSWORD || bcrypt.compareSync(password, ADMIN_PASSWORD_HASH);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { username } });
});

// Auth: Me
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ username: req.user.username });
});

// Helper for slug generation
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

// GET Listings (Direct from MongoDB)
app.get('/api/listings', optionalAuthenticateToken, async (req, res) => {
  try {
    await connectDB();

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    let query = {};
    // If admin is authenticated, or ?all=true is requested by admin
    if (req.user) {
      query = {}; // return all listings (disabled, active, delisted)
    } else {
      // Public visitors: only return active listings that are NOT disabled
      query = {
        disabled: { $ne: true },
        status: { $ne: 'delisted' }
      };
    }

    const docs = await Listing.find(query)
      .sort({ featured: -1, updatedAt: -1, createdAt: -1 })
      .lean();

    const listings = docs.map(doc => ({
      ...doc,
      id: doc.slug || (doc._id ? doc._id.toString() : '')
    }));

    return res.json(listings);
  } catch (err) {
    console.error('[API] Error in GET /api/listings:', err);
    res.status(500).json({ error: `Failed to fetch listings from MongoDB: ${err.message}` });
  }
});

// GET Single Listing by Slug or ID
app.get('/api/listings/:id', optionalAuthenticateToken, async (req, res) => {
  try {
    await connectDB();
    const id = req.params.id;

    const query = {
      $or: [
        { slug: id },
        ...(mongoose.Types.ObjectId.isValid(id) ? [{ _id: id }] : [])
      ]
    };

    const doc = await Listing.findOne(query).lean();
    if (!doc) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Public cannot view disabled or delisted unless admin
    if (!req.user && (doc.disabled || doc.status === 'delisted')) {
      return res.status(404).json({ error: 'Property not available' });
    }

    const formatted = {
      ...doc,
      id: doc.slug || (doc._id ? doc._id.toString() : '')
    };

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch listing: ${err.message}` });
  }
});

// POST: Create custom listing in MongoDB
app.post('/api/listings', authenticateToken, async (req, res) => {
  try {
    await connectDB();
    const record = req.body;
    if (!record.title) {
      return res.status(400).json({ error: 'Property title is required' });
    }

    const slug = record.slug || slugify(record.id || record.title);

    // Check if slug exists
    const existing = await Listing.findOne({ slug });
    if (existing) {
      return res.status(400).json({ error: `A property with slug "${slug}" already exists.` });
    }

    const now = new Date().toISOString();
    const newDoc = await Listing.create({
      slug,
      title: record.title,
      url: record.url || '',
      address: record.address || 'Singapore',
      district: record.district || 'D11',
      propertyType: record.propertyType || 'Condo',
      beds: record.beds || null,
      baths: record.baths || null,
      floorAreaSqft: record.floorAreaSqft || null,
      price: record.price ? Number(record.price) : null,
      psf: record.psf ? Number(record.psf) : null,
      topYear: record.topYear || '',
      unitsSoldPercent: record.unitsSoldPercent !== undefined && record.unitsSoldPercent !== null ? Number(record.unitsSoldPercent) : null,
      tenure: record.tenure || '99 years',
      totalUnits: record.totalUnits ? Number(record.totalUnits) : null,
      developer: record.developer || 'Independent Developer',
      agentName: record.agentName || '',
      agentLicense: record.agentLicense || '',
      phone: record.phone || '',
      image: record.image || '',
      images: Array.isArray(record.images) ? record.images : [],
      agentPhoto: record.agentPhoto || '',
      layouts: Array.isArray(record.layouts) ? record.layouts : [],
      facilities: Array.isArray(record.facilities) ? record.facilities : [],
      priceRanges: Array.isArray(record.priceRanges) ? record.priceRanges : [],
      history: Array.isArray(record.history) ? record.history : [],
      status: 'active',
      lastSeen: now,
      disabled: record.disabled === true,
      featured: record.featured === true,
      custom: true
    });

    const responseObj = {
      ...newDoc.toObject(),
      id: newDoc.slug
    };

    syncLocalBackups();

    res.status(201).json(responseObj);
  } catch (err) {
    console.error('[API] Error creating listing in MongoDB:', err);
    res.status(500).json({ error: `Failed to create listing: ${err.message}` });
  }
});

// PUT: Update a listing in MongoDB
app.put('/api/listings/:id', authenticateToken, async (req, res) => {
  try {
    await connectDB();
    const id = req.params.id;
    const updateFields = { ...req.body };

    // Don't overwrite immutable identifiers
    delete updateFields._id;
    delete updateFields.id;

    const query = {
      $or: [
        { slug: id },
        ...(mongoose.Types.ObjectId.isValid(id) ? [{ _id: id }] : [])
      ]
    };

    const doc = await Listing.findOne(query);
    if (!doc) {
      return res.status(404).json({ error: `Listing with ID/slug "${id}" not found.` });
    }

    // Apply updates
    Object.keys(updateFields).forEach(key => {
      doc[key] = updateFields[key];
    });

    doc.lastSeen = new Date().toISOString();
    await doc.save();

    const formatted = {
      ...doc.toObject(),
      id: doc.slug || doc._id.toString()
    };

    syncLocalBackups();

    res.json(formatted);
  } catch (err) {
    console.error('[API] Error updating listing in MongoDB:', err);
    res.status(500).json({ error: `Failed to update listing: ${err.message}` });
  }
});

// DELETE: Delete a listing from MongoDB
app.delete('/api/listings/:id', authenticateToken, async (req, res) => {
  try {
    await connectDB();
    const id = req.params.id;

    const query = {
      $or: [
        { slug: id },
        ...(mongoose.Types.ObjectId.isValid(id) ? [{ _id: id }] : [])
      ]
    };

    const deleted = await Listing.findOneAndDelete(query);
    if (!deleted) {
      return res.status(404).json({ error: `Listing with ID "${id}" not found.` });
    }

    syncLocalBackups();

    res.json({ success: true, message: `Listing "${id}" deleted successfully from MongoDB.` });
  } catch (err) {
    console.error('[API] Error deleting listing from MongoDB:', err);
    res.status(500).json({ error: `Failed to delete listing: ${err.message}` });
  }
});

// Serve frontend build static files in production
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('API Server Running with MongoDB. Please start frontend dev server or build frontend to serve UI.');
  });
}

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[Server] Backend API Server running at http://localhost:${PORT}`);
    console.log(`[Server] Connected to MongoDB database: test`);
  });
}

module.exports = app;
