/**
 * routes/status.js — PUT /api/hazards/:id/status
 * Ticket workflow updates: Detected → Assigned → In Progress → Resolved
 */

const express = require('express');
const router = express.Router();
const storageAdapter = require('../services/storageAdapter');
const { authenticate, requireRole } = require('../middleware/auth');

const VALID_STATUSES = ['Detected', 'Assigned', 'In Progress', 'Resolved'];

router.put('/:id/status', authenticate, requireRole('officer', 'admin'), async (req, res) => {
  try {
    const { status, assigned_to, notes } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
      });
    }

    const hazard = await storageAdapter.getHazardById(req.params.id);
    if (!hazard) {
      return res.status(404).json({ success: false, message: 'Hazard not found' });
    }

    const update = {
      status,
      updated_by: req.user.uid,
      updated_by_email: req.user.email
    };

    if (assigned_to) update.assigned_to = assigned_to;
    if (notes) update.notes = notes;
    if (status === 'Resolved') update.resolved_at = new Date().toISOString();

    const updatedHazard = await storageAdapter.updateHazard(req.params.id, update);

    console.log(`[Status Workflow] Hazard ${req.params.id.slice(0, 8)} → ${status} by ${req.user.email}`);

    return res.status(200).json({
      success: true,
      message: `Hazard status updated to "${status}"`,
      hazard_id: req.params.id,
      new_status: status,
      hazard: updatedHazard
    });

  } catch (err) {
    console.error('[PUT /api/hazards/:id/status] Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
