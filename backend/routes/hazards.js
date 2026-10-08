/**
 * routes/hazards.js — Hazard retrieval, analytics, and single hazard lookup
 */

const express = require('express');
const router = express.Router();
const storageAdapter = require('../services/storageAdapter');

// ── GET /analytics/summary ───────────────────────────────────
// Must be declared before /:id route
router.get('/analytics/summary', async (req, res) => {
  try {
    const summary = await storageAdapter.getAnalyticsSummary();
    return res.status(200).json({
      success: true,
      analytics: summary
    });
  } catch (err) {
    console.error('[GET /analytics/summary] Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET / — List hazards ─────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { type, severity, status, limit = 100 } = req.query;
    const result = await storageAdapter.getHazards({ type, severity, status, limit });

    return res.status(200).json({
      success: true,
      count: result.count,
      total: result.total,
      hazards: result.hazards
    });
  } catch (err) {
    console.error('[GET /api/hazards] Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /:id — Single hazard ─────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const hazard = await storageAdapter.getHazardById(req.params.id);
    if (!hazard) {
      return res.status(404).json({ success: false, message: 'Hazard not found' });
    }

    return res.status(200).json({
      success: true,
      hazard
    });
  } catch (err) {
    console.error('[GET /api/hazards/:id] Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
