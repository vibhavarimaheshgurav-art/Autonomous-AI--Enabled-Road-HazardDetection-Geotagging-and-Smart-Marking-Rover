/**
 * config/firebase.js
 * Firebase Admin SDK — Firestore + Storage initialisation with active state detection
 */

const admin = require('firebase-admin');
let initialized = false;
let firebaseActive = false;

function initializeFirebase() {
  if (initialized) return { active: firebaseActive };

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || (projectId ? `${projectId}.appspot.com` : undefined);

  if (projectId && clientEmail && privateKey && !privateKey.includes('your-project-id')) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        storageBucket: storageBucket
      });
      firebaseActive = true;
      console.log('✓ Firebase Admin SDK connected (Firestore + Cloud Storage active)');
    } catch (err) {
      console.warn('⚠️ Firebase Admin init failed:', err.message);
      firebaseActive = false;
    }
  } else {
    console.log('ℹ️ Firebase credentials not provided in .env — using local JSON/disk storage engine.');
    firebaseActive = false;
  }

  initialized = true;
  return { active: firebaseActive };
}

function isFirebaseActive() {
  return firebaseActive;
}

/** @returns {FirebaseFirestore.Firestore} */
function getFirestore() {
  return admin.firestore();
}

/** @returns {Storage.Bucket} */
function getStorage() {
  return admin.storage().bucket();
}

module.exports = { initializeFirebase, isFirebaseActive, getFirestore, getStorage };
