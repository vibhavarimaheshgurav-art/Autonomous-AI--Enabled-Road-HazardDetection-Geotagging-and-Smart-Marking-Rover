/**
 * services/storageAdapter.js
 * Unified storage adapter supporting Firebase Firestore & Storage with
 * automatic local fallback (data/hazards.json + uploads/) for zero-config offline demos.
 */

const fs = require('fs');
const path = require('path');
const { getFirestore, getStorage, isFirebaseActive } = require('../config/firebase');

const DATA_DIR = path.join(__dirname, '..', 'data');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const DB_FILE = path.join(DATA_DIR, 'hazards.json');

// Ensure local directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '[]', 'utf8');

let localHazards = [];

function loadLocalHazards() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    localHazards = JSON.parse(raw);
    if (!Array.isArray(localHazards)) localHazards = [];
  } catch (e) {
    localHazards = [];
  }
  return localHazards;
}

loadLocalHazards();

function persistLocalHazards() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(localHazards, null, 2), 'utf8');
  } catch (e) {
    console.error('[StorageAdapter] Failed to persist hazards.json:', e.message);
  }
}

const storageAdapter = {
  isFirebase: () => isFirebaseActive(),

  /**
   * Save uploaded image file. Returns accessible URL string.
   */
  async saveImage(hazardId, fileBuffer, mimeType) {
    if (!fileBuffer) return null;

    // 1. Try Firebase Storage if active
    if (isFirebaseActive()) {
      try {
        const bucket = getStorage();
        const filename = `hazards/${hazardId}/image.jpg`;
        const file = bucket.file(filename);
        await file.save(fileBuffer, {
          metadata: { contentType: mimeType || 'image/jpeg' },
          resumable: false
        });
        await file.makePublic().catch(() => {});
        return `https://storage.googleapis.com/${bucket.name}/${filename}`;
      } catch (err) {
        console.warn('[StorageAdapter] Firebase Storage upload failed, saving locally:', err.message);
      }
    }

    // 2. Local file storage fallback
    try {
      const ext = mimeType === 'image/png' ? '.png' : '.jpg';
      const localFilename = `${hazardId}${ext}`;
      const localPath = path.join(UPLOADS_DIR, localFilename);
      fs.writeFileSync(localPath, fileBuffer);
      return `/uploads/${localFilename}`;
    } catch (err) {
      console.error('[StorageAdapter] Local image save failed:', err.message);
      return null;
    }
  },

  /**
   * Create or overwrite a hazard record
   */
  async saveHazard(hazardDoc) {
    // 1. Firebase Firestore
    if (isFirebaseActive()) {
      try {
        const db = getFirestore();
        await db.collection('hazards').doc(hazardDoc.id).set(hazardDoc);
      } catch (err) {
        console.warn('[StorageAdapter] Firestore write failed, writing locally:', err.message);
      }
    }

    // 2. Local JSON file mirror / primary
    const existingIdx = localHazards.findIndex(h => h.id === hazardDoc.id);
    if (existingIdx >= 0) {
      localHazards[existingIdx] = { ...localHazards[existingIdx], ...hazardDoc };
    } else {
      localHazards.unshift(hazardDoc);
    }
    persistLocalHazards();
    return hazardDoc;
  },

  /**
   * Update fields of an existing hazard record
   */
  async updateHazard(hazardId, updateFields) {
    updateFields.updated_at = new Date().toISOString();

    if (isFirebaseActive()) {
      try {
        const db = getFirestore();
        await db.collection('hazards').doc(hazardId).update(updateFields);
      } catch (err) {
        console.warn(`[StorageAdapter] Firestore update failed for ${hazardId}:`, err.message);
      }
    }

    const idx = localHazards.findIndex(h => h.id === hazardId);
    if (idx >= 0) {
      localHazards[idx] = { ...localHazards[idx], ...updateFields };
      persistLocalHazards();
      return localHazards[idx];
    }
    return null;
  },

  /**
   * Retrieve a single hazard by ID
   */
  async getHazardById(hazardId) {
    if (isFirebaseActive()) {
      try {
        const db = getFirestore();
        const doc = await db.collection('hazards').doc(hazardId).get();
        if (doc.exists) return { ...doc.data(), id: doc.id };
      } catch (err) {
        console.warn(`[StorageAdapter] Firestore getById failed for ${hazardId}:`, err.message);
      }
    }

    return localHazards.find(h => h.id === hazardId) || null;
  },

  /**
   * Retrieve list of hazards with optional filtering and pagination
   */
  async getHazards(options = {}) {
    const { type, severity, status, limit = 100 } = options;
    const limitNum = Math.min(parseInt(limit) || 100, 500);

    if (isFirebaseActive()) {
      try {
        const db = getFirestore();
        let query = db.collection('hazards').orderBy('created_at', 'desc');
        if (type) query = query.where('ai_hazard_type', '==', type);
        if (severity) query = query.where('severity', '==', severity);
        if (status) query = query.where('status', '==', status);

        const snap = await query.limit(limitNum).get();
        const results = [];
        snap.forEach(d => results.push({ ...d.data(), id: d.id }));
        if (results.length > 0) {
          return { count: results.length, total: results.length, hazards: results };
        }
      } catch (err) {
        console.warn('[StorageAdapter] Firestore getHazards query failed, using local:', err.message);
      }
    }

    // Local filtering
    let list = [...localHazards];
    if (type) list = list.filter(h => (h.ai_hazard_type || h.trigger_reason) === type);
    if (severity) list = list.filter(h => h.severity === severity);
    if (status) list = list.filter(h => h.status === status);

    list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    const sliced = list.slice(0, limitNum);

    return {
      count: sliced.length,
      total: list.length,
      hazards: sliced
    };
  },

  /**
   * Aggregate hazard analytics summary
   */
  async getAnalyticsSummary() {
    let list = [];
    if (isFirebaseActive()) {
      try {
        const db = getFirestore();
        const snap = await db.collection('hazards').get();
        snap.forEach(d => list.push(d.data()));
      } catch (err) {
        console.warn('[StorageAdapter] Firestore summary failed, using local cache:', err.message);
        list = localHazards;
      }
    } else {
      list = localHazards;
    }

    const summary = {
      total: 0,
      high_severity: 0,
      pending: 0,
      resolved: 0,
      by_severity: { High: 0, Critical: 0, Medium: 0, Low: 0 },
      by_status: { Detected: 0, Assigned: 0, 'In Progress': 0, Resolved: 0 },
      by_type: {},
      daily_trend: {}
    };

    list.forEach(d => {
      summary.total++;
      const sev = d.severity || 'Medium';
      summary.by_severity[sev] = (summary.by_severity[sev] || 0) + 1;

      const st = d.status || 'Detected';
      summary.by_status[st] = (summary.by_status[st] || 0) + 1;

      const t = d.ai_hazard_type || d.trigger_reason || 'unknown';
      summary.by_type[t] = (summary.by_type[t] || 0) + 1;

      const day = (d.created_at || '').split('T')[0];
      if (day) summary.daily_trend[day] = (summary.daily_trend[day] || 0) + 1;
    });

    summary.high_severity = (summary.by_severity.High || 0) + (summary.by_severity.Critical || 0);
    summary.pending = (summary.by_status.Detected || 0) + (summary.by_status.Assigned || 0);
    summary.resolved = summary.by_status.Resolved || 0;

    const byTypeArr = Object.entries(summary.by_type)
      .map(([_id, count]) => ({ _id, count }))
      .sort((a, b) => b.count - a.count);

    const dailyTrendArr = Object.entries(summary.daily_trend)
      .map(([_id, count]) => ({ _id, count }))
      .sort((a, b) => a._id.localeCompare(b._id))
      .slice(-14);

    return {
      ...summary,
      by_type: byTypeArr,
      daily_trend: dailyTrendArr
    };
  }
};

module.exports = storageAdapter;
