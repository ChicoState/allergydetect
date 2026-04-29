const admin = require('firebase-admin');
const getDb = require('../firebase');

async function requireAuth(req, res, next) {
  if (req.method === 'OPTIONS') {
    console.log(`[auth] OPTIONS ${req.path} - skipping auth`);
    return next();
  }

  const authHeader = req.headers.authorization;

  console.log(`[auth] ${req.method} ${req.path} - auth header present: ${Boolean(authHeader)}`);

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.slice(7).trim();

  try {
    await getDb();
    req.user = await admin.auth().verifyIdToken(token);
    console.log(`[auth] ${req.method} ${req.path} - authenticated user: ${req.user.uid}`);
    next();
  } catch (err) {
    console.error(`[auth] ${req.method} ${req.path} - token verification failed:`, err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = requireAuth;
