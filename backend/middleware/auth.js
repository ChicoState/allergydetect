const admin = require('firebase-admin');
const getDb = require('../firebase');

async function requireAuth(req, res, next) {
  if (req.method === 'OPTIONS') {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    await getDb();
    req.user = await admin.auth().verifyIdToken(token);
    next();
  } catch (err) {
    console.error(`[auth] ${req.method} ${req.path} - token verification failed:`, err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = requireAuth;
