/**
 * routes/hazardReport.js — POST /api/hazard-report
 * Matches the exact hardware contract of the ESP32-CAM firmware.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const storageAdapter = require('../services/storageAdapter');
const { processHazardJob } = require('../services/aiWorker');

// Multer memory storage for incoming camera frame
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (_req, file, cb) => {
    // Accept images or octet-stream (some ESP32 HTTP clients send raw stream)
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/octet-stream') {
      cb(null, true);
    } else {
      cb(null, true); // Permissive to never drop hardware telemetry
    }
  }
});

function calculateImmediateSeverity(triggerReason, sensorData) {
  const water = sensorData.water_level || sensorData.water_sensor_value || 0;
  const dist1 = sensorData.dist1 !== null ? sensorData.dist1 : (sensorData.distance_cm_front || 50);
  const trigger = (triggerReason || '').toLowerCase();

  if (water > 2200 || dist1 < 8.0 || trigger.includes('waterlogging') && water > 1500) {
    return 'High';
  }
  if (water > 1000 || dist1 < 15.0 || trigger.includes('pothole') || trigger.includes('low_light')) {
    return 'Medium';
  }
  if (trigger.includes('periodic_scan')) {
    return 'Low';
  }
  return 'Medium';
}

router.post('/', upload.single('image'), async (req, res) => {
  try {
    let body = req.body || {};

    // Support nested "metadata" JSON blob if firmware sends it as a single string
    if (body.metadata) {
      try {
        const parsed = JSON.parse(body.metadata);
        body = { ...body, ...parsed };
      } catch (e) {
        // use body as-is
      }
    }

    const {
      rover_id = 'ROVER-001',
      latitude,
      longitude,
      altitude = 0,
      gps_fixed = true,
      satellites = 6,
      trigger_reason = 'periodic_scan',
      timestamp,
      dist1,
      dist2,
      dist3,
      distance_cm_front,
      distance_cm_left,
      distance_cm_right,
      ldr_value,
      water_level,
      water_sensor_value,
      ir_triggered,
      image_base64
    } = body;

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payload: latitude and longitude are required numeric coordinates.'
      });
    }

    // Parse distance fields (supporting both dist1/2/3 and distance_cm_front/left/right)
    const parsedDist1 = dist1 !== undefined ? parseFloat(dist1) : (distance_cm_front !== undefined ? parseFloat(distance_cm_front) : null);
    const parsedDist2 = dist2 !== undefined ? parseFloat(dist2) : (distance_cm_left !== undefined ? parseFloat(distance_cm_left) : null);
    const parsedDist3 = dist3 !== undefined ? parseFloat(dist3) : (distance_cm_right !== undefined ? parseFloat(distance_cm_right) : null);

    const parsedLdr = ldr_value !== undefined ? parseInt(ldr_value) : null;
    const parsedWater = water_level !== undefined ? parseInt(water_level) : (water_sensor_value !== undefined ? parseInt(water_sensor_value) : null);
    const parsedIr = ir_triggered !== undefined ? (String(ir_triggered).toLowerCase() === 'true' || ir_triggered === 1 || ir_triggered === true) : false;

    const sensorData = {
      dist1: parsedDist1,
      dist2: parsedDist2,
      dist3: parsedDist3,
      distance_cm_front: parsedDist1,
      distance_cm_left: parsedDist2,
      distance_cm_right: parsedDist3,
      ldr_value: parsedLdr,
      water_level: parsedWater,
      water_sensor_value: parsedWater,
      ir_triggered: parsedIr
    };

    const hazardId = uuidv4();
    const reasonField = trigger_reason || 'periodic_scan';
    const estimatedSeverity = calculateImmediateSeverity(reasonField, sensorData);

    // Save image
    let imageUrl = null;
    if (req.file) {
      imageUrl = await storageAdapter.saveImage(hazardId, req.file.buffer, req.file.mimetype);
    } else if (image_base64) {
      try {
        const cleanB64 = image_base64.replace(/^data:image\/\w+;base64,/, '');
        const buf = Buffer.from(cleanB64, 'base64');
        imageUrl = await storageAdapter.saveImage(hazardId, buf, 'image/jpeg');
      } catch (b64Err) {
        console.warn('[HazardReport] Base64 image decoding failed:', b64Err.message);
      }
    }

    const locationKey = `${lat.toFixed(3)}_${lng.toFixed(3)}`;
    const createdAt = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();

    const hazardDoc = {
      id: hazardId,
      rover_id,
      trigger_reason: reasonField,
      latitude: lat,
      longitude: lng,
      altitude: parseFloat(altitude) || 0,
      gps_fixed: Boolean(gps_fixed === 'true' || gps_fixed === true),
      satellites: parseInt(satellites) || 0,
      sensor_data: sensorData,
      image_url: imageUrl,
      estimated_severity: estimatedSeverity,
      severity: estimatedSeverity,
      status: 'Detected',
      processing_status: 'queued',
      location_key: locationKey,
      created_at: createdAt,
      updated_at: createdAt,
      // AI fields populated asynchronously
      ai_hazard_type: null,
      ai_confidence: null,
      ai_severity: null,
      ai_report: null,
      cluster_info: null,
      trend_info: null,
      is_anomaly: false,
      anomaly_score: null,
      anomaly_flags: [],
      processed_at: null
    };

    await storageAdapter.saveHazard(hazardDoc);

    // Enqueue non-blocking AI pipeline job
    processHazardJob(hazardId, imageUrl, sensorData, req.file ? req.file.buffer : null);

    // Compute real-time navigation and marking directive for rover
    let command = 'CRUISE_FORWARD';
    let speed = 150;
    let triggerMarking = false;
    let markDuration = 500;

    const waterVal = sensorData.water_level || sensorData.water_sensor_value || 0;
    const frontDist = sensorData.dist1 !== null ? sensorData.dist1 : (sensorData.distance_cm_front || 50);
    const leftDist = sensorData.dist2 !== null ? sensorData.dist2 : (sensorData.distance_cm_left || 50);
    const rightDist = sensorData.dist3 !== null ? sensorData.dist3 : (sensorData.distance_cm_right || 50);

    if (waterVal > 2200 || frontDist < 8.0) {
      command = 'STOP';
      speed = 0;
      triggerMarking = true;
    } else if (frontDist < 15.0 || reasonField.includes('pothole')) {
      command = 'STOP';
      speed = 0;
      triggerMarking = true;
    } else if (leftDist < 20.0) {
      command = 'STEER_RIGHT';
      speed = 120;
    } else if (rightDist < 20.0) {
      command = 'STEER_LEFT';
      speed = 120;
    }

    console.log(`[ROVER TELEMETRY] Report received: ${hazardId.slice(0, 8)} | Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)} | Reason: ${reasonField} | Cmd: ${command}`);

    return res.status(201).json({
      success: true,
      message: 'Hazard report received and queued for AI processing',
      hazard_id: hazardId,
      estimated_severity: estimatedSeverity,
      command,
      speed,
      actuator: {
        trigger_marking: triggerMarking,
        duration_ms: markDuration
      },
      watchdog_ttl_ms: 1500
    });

  } catch (err) {
    console.error('[POST /api/hazard-report] Error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Internal server error processing rover telemetry'
    });
  }
});

module.exports = router;
