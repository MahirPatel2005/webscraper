import { connectDB, Listing } from './_db.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'she-real-estate-secret-key-12345';

function getAuthUser(req) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  await connectDB();
  const user = getAuthUser(req);

  if (req.method === 'GET') {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      let query = {};
      if (user) {
        // Authenticated admin sees all
        query = {};
      } else {
        // Public sees only enabled, active
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

      return res.status(200).json(listings);
    } catch (err) {
      console.error('[Vercel API] listings GET error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    if (!user) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }

    try {
      const record = req.body || {};
      if (!record.title) {
        return res.status(400).json({ error: 'Property title is required' });
      }

      const slug = record.slug || record.title.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
      const existing = await Listing.findOne({ slug });
      if (existing) {
        return res.status(400).json({ error: `Listing with slug "${slug}" already exists.` });
      }

      const newDoc = await Listing.create({
        ...record,
        slug,
        disabled: record.disabled === true,
        featured: record.featured === true,
        custom: true
      });

      return res.status(201).json({
        ...newDoc.toObject(),
        id: newDoc.slug
      });
    } catch (err) {
      console.error('[Vercel API] listings POST error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
