/**
 * middleware/auth.js
 * Firebase Auth token verification + role-based access control + Demo Mode support.
 */

const admin = require('firebase-admin');
const { getFirestore, isFirebaseActive } = require('../config/firebase');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Missing Authorization: Bearer <token> header' });
  }

  const token = authHeader.slice(7);

  // 1. Support instant demo mode tokens (e.g. mock-token-admin, mock-token-officer)
  if (token.startsWith('mock-token-') || token === 'demo-token') {
    let role = 'officer';
    if (token.includes('admin')) role = 'admin';
    else if (token.includes('citizen')) role = 'citizen';

    req.user = {
      uid: `demo-${role}-001`,
      email: `${role}@smartrover.civic`,
      role
    };
    return next();
  }

  // 2. Real Firebase Auth token verification
  if (isFirebaseActive()) {
    try {
      const decoded = await admin.auth().verifyIdToken(token);
      let role = 'citizen';
      try {
        const db = getFirestore();
        const userDoc = await db.collection('users').doc(decoded.uid).get();
        if (userDoc.exists) role = userDoc.data().role || 'citizen';
      } catch (dbErr) {
        // use default role
      }

      req.user = { uid: decoded.uid, email: decoded.email, role };
      return next();
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired Firebase token' });
    }
  }

  // 3. Fallback when Firebase is not configured
  req.user = {
    uid: 'local-officer-01',
    email: 'officer@smartrover.local',
    role: 'officer'
  };
  return next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden — required role: ${roles.join(' or ')}, your role: ${req.user.role}`
      });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
