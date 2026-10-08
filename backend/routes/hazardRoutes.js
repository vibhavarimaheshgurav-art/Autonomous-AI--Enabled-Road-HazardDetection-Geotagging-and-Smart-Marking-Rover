/**
 * hazardRoutes.js — API Routes for Hazard Reporting
 * Autonomous Edge-AI Multi-Hazard Detection Rover
 */

const express = require('express');
const router  = express.Router();
const Hazard  = require('../models/Hazard');

// ─── POST /api/hazards ───────────────────────────────────────
// Receive hazard report from ESP32 rover or simulator
router.post('/', async (req, res) => {
  try {
    const {
      rover_id, hazard_type, severity, latitude, longitude,
      altitude, gps_fixed, satellites, sensor_values,
      image_base64, firmware, timestamp
    } = req.body;

    // Basic validation
    if (!hazard_type) {
      return res.status(400).json({ success: false, message: 'hazard_type is required' });
    }
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: 'latitude and longitude are required' });
    }

    const hazard = new Hazard({
      rover_id:     rover_id    || 'ROVER-001',
      hazard_type,
      severity:     severity    || 'Medium',
      latitude:     parseFloat(latitude),
      longitude:    parseFloat(longitude),
      altitude:     altitude    || 0,
      gps_fixed:    gps_fixed   || false,
      satellites:   satellites  || 0,
      sensor_values: sensor_values || {},
      image_base64: image_base64 || '',
      firmware:     firmware    || '2.0.0'
    });

    // Use provided timestamp or let MongoDB handle it via timestamps: true
    if (timestamp) {
      hazard.createdAt = new Date(timestamp);
    }

    await hazard.save();

    console.log(`[+] Hazard saved: ${hazard_type} [${hazard.severity}] @ (${latitude}, ${longitude})`);

    return res.status(201).json({
      success:  true,
      message:  'Hazard report received and stored',
      hazard_id: hazard._id,
      severity:  hazard.severity
    });

  } catch (err) {
    console.error('[POST /api/hazards] Error:', err.message);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── GET /api/hazards ────────────────────────────────────────
// Fetch all hazards, supports query filters
router.get('/', async (req, res) => {
  try {
    const { type, severity, status, limit = 200, page = 1 } = req.query;
    const filter = {};
    if (type)     filter.hazard_type = type;
    if (severity) filter.severity    = severity;
    if (status)   filter.status      = status;

    const skip   = (parseInt(page) - 1) * parseInt(limit);
    const total  = await Hazard.countDocuments(filter);
    const hazards = await Hazard.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .select('-image_base64') // Exclude image from list view for performance
      .lean();

    return res.status(200).json({
      success: true,
      total,
      page:    parseInt(page),
      count:   hazards.length,
      hazards
    });
  } catch (err) {
    console.error('[GET /api/hazards] Error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── GET /api/hazards/:id ────────────────────────────────────
// Fetch single hazard with full image
router.get('/:id', async (req, res) => {
  try {
    const hazard = await Hazard.findById(req.params.id).lean();
    if (!hazard) return res.status(404).json({ success: false, message: 'Hazard not found' });
    return res.status(200).json({ success: true, hazard });
  } catch (err) {
    console.error('[GET /api/hazards/:id] Error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── PUT /api/hazards/:id ────────────────────────────────────
// Update hazard status or notes
router.put('/:id', async (req, res) => {
  try {
    const { status, notes, resolved_by } = req.body;
    const update = {};
    if (status)      update.status      = status;
    if (notes)       update.notes       = notes;
    if (resolved_by) update.resolved_by = resolved_by;
    if (status === 'Resolved') update.resolved_at = new Date();

    const hazard = await Hazard.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!hazard) return res.status(404).json({ success: false, message: 'Hazard not found' });
    return res.status(200).json({ success: true, message: 'Hazard updated', hazard });
  } catch (err) {
    console.error('[PUT /api/hazards/:id] Error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── DELETE /api/hazards/:id ─────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const hazard = await Hazard.findByIdAndDelete(req.params.id);
    if (!hazard) return res.status(404).json({ success: false, message: 'Hazard not found' });
    return res.status(200).json({ success: true, message: 'Hazard deleted' });
  } catch (err) {
    console.error('[DELETE /api/hazards/:id] Error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── GET /api/hazards/analytics/summary ─────────────────────
router.get('/analytics/summary', async (req, res) => {
  try {
    const [
      totalCount,
      bySeverity,
      byType,
      byStatus,
      recentTrend
    ] = await Promise.all([
      Hazard.countDocuments({}),

      Hazard.aggregate([
        { $group: { _id: '$severity', count: { $sum: 1 } } }
      ]),

      Hazard.aggregate([
        { $group: { _id: '$hazard_type', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),

      Hazard.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      // Last 7 days trend
      Hazard.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    // Flatten counts
    const severityMap  = {};
    bySeverity.forEach(s => { severityMap[s._id] = s.count; });
    const statusMap    = {};
    byStatus.forEach(s => { statusMap[s._id] = s.count; });

    return res.status(200).json({
      success: true,
      analytics: {
        total:           totalCount,
        high_severity:   severityMap['High']    || 0,
        medium_severity: severityMap['Medium']  || 0,
        low_severity:    severityMap['Low']     || 0,
        pending:         statusMap['Pending']   || 0,
        in_progress:     statusMap['In Progress'] || 0,
        resolved:        statusMap['Resolved']  || 0,
        by_type:         byType,
        daily_trend:     recentTrend
      }
    });
  } catch (err) {
    console.error('[GET /analytics/summary] Error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
