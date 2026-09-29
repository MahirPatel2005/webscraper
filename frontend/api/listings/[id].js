import { connectDB, Listing } from '../_db.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Property ID or slug required' });
  }

  await connectDB();
  const user = getAuthUser(req);

  const query = {
    $or: [
      { slug: id },
      ...(mongoose.Types.ObjectId.isValid(id) ? [{ _id: id }] : [])
    ]
  };

  if (req.method === 'GET') {
    try {
      const doc = await Listing.findOne(query).lean();
      if (!doc) {
        return res.status(404).json({ error: 'Listing not found' });
      }

      if (!user && (doc.disabled || doc.status === 'delisted')) {
        return res.status(404).json({ error: 'Listing is not available' });
      }

      return res.status(200).json({
        ...doc,
        id: doc.slug || (doc._id ? doc._id.toString() : '')
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'PUT') {
    if (!user) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }

    try {
      const updateFields = { ...req.body };
      delete updateFields._id;
      delete updateFields.id;

      const doc = await Listing.findOne(query);
      if (!doc) {
        return res.status(404).json({ error: `Listing "${id}" not found` });
      }

      Object.keys(updateFields).forEach(k => {
        doc[k] = updateFields[k];
      });

      doc.lastSeen = new Date().toISOString();
      await doc.save();

      return res.status(200).json({
        ...doc.toObject(),
        id: doc.slug || doc._id.toString()
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    if (!user) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }

    try {
      const deleted = await Listing.findOneAndDelete(query);
      if (!deleted) {
        return res.status(404).json({ error: `Listing "${id}" not found` });
      }
      return res.status(200).json({ success: true, message: `Listing "${id}" deleted.` });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
