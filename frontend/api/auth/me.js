import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'she-real-estate-secret-key-12345';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    return res.status(200).json({ username: user.username });
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}
