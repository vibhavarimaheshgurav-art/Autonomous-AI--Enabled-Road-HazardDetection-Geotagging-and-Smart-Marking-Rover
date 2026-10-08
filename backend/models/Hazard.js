/**
 * Hazard.js — MongoDB Schema for Civic Hazard Reports
 * Smart Civic Hazard Monitoring Rover — 5-Class Detection System
 * Detection classes: Pothole | Garbage | Faded Road Marking | Encroachment | Vehicle
 */

const mongoose = require('mongoose');

const SensorValuesSchema = new mongoose.Schema({
  distance_cm:    { type: Number, default: null },
  light_level:    { type: Number, default: null },
  water_level:    { type: Number, default: null },
  moisture_level: { type: Number, default: null },
  pressure_hpa:   { type: Number, default: null },
  temperature_c:  { type: Number, default: null }
}, { _id: false });

const HazardSchema = new mongoose.Schema({
  rover_id: {
    type: String,
    default: 'ROVER-001'
  },
  hazard_type: {
    type: String,
    required: [true, 'Hazard type is required'],
    enum: [
      'Pothole',
      'Garbage',
      'Faded Road Marking',
      'Encroachment',
      'Vehicle'
    ]
  },
  severity: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Resolved'],
    default: 'Pending'
  },
  latitude: {
    type: Number,
    required: [true, 'Latitude is required'],
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    required: [true, 'Longitude is required'],
    min: -180,
    max: 180
  },
  altitude: {
    type: Number,
    default: 0
  },
  gps_fixed: {
    type: Boolean,
    default: false
  },
  satellites: {
    type: Number,
    default: 0
  },
  sensor_values: {
    type: SensorValuesSchema,
    default: {}
  },
  image_base64: {
    type: String,
    default: ''
  },
  firmware: {
    type: String,
    default: '2.0.0'
  },
  notes: {
    type: String,
    default: ''
  },
  resolved_at: {
    type: Date,
    default: null
  },
  resolved_by: {
    type: String,
    default: null
  }
}, {
  timestamps: true  // adds createdAt, updatedAt automatically
});

// Index for geo queries and fast dashboard loads
HazardSchema.index({ createdAt: -1 });
HazardSchema.index({ hazard_type: 1, severity: 1 });
HazardSchema.index({ status: 1 });
HazardSchema.index({ latitude: 1, longitude: 1 });

// Auto-calculate severity if not provided
HazardSchema.pre('save', function (next) {
  if (!this.severity || this.severity === 'Medium') {
    const sv = this.sensor_values || {};
    // Pothole: critical depth (< 8 cm from ultrasonic sensor) → High severity
    if (this.hazard_type === 'Pothole' && sv.distance_cm < 8) {
      this.severity = 'High';
    // Encroachment: lateral obstruction within 18 cm → High severity
    } else if (this.hazard_type === 'Encroachment' && sv.distance_cm < 18) {
      this.severity = 'High';
    }
  }
  next();
});

// Virtual: age in hours
HazardSchema.virtual('age_hours').get(function () {
  return Math.floor((Date.now() - this.createdAt) / 3600000);
});

module.exports = mongoose.model('Hazard', HazardSchema);
