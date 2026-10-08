/**
 * seed-data.js — Populate storage with realistic test hazards for student demos
 * Run: cd backend && node seed-data.js
 */

require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const storageAdapter = require('./services/storageAdapter');

const CITIES = [
  { name: 'Pune (Main Corridor)', lat: 18.5204, lon: 73.8567 },
  { name: 'FC Road', lat: 18.5284, lon: 73.8415 },
  { name: 'Kothrud', lat: 18.5074, lon: 73.8077 },
  { name: 'Shivajinagar', lat: 18.5314, lon: 73.8445 },
  { name: 'Viman Nagar', lat: 18.5679, lon: 73.9143 }
];

function jitter(val, range) {
  return val + (Math.random() - 0.5) * range;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const TEMPLATES = [
  {
    type: 'pothole',
    trigger: 'pothole_suspect',
    severity: 'High',
    conf: 0.94,
    report: 'Severe road surface cavity identified. Poses immediate damage risk to vehicles. Urgent patching required.',
    sensors: { dist1: 6.2, dist2: 45.0, dist3: 42.0, ldr_value: 2300, water_level: 150, ir_triggered: false }
  },
  {
    type: 'waterlogging',
    trigger: 'waterlogging_suspect',
    severity: 'High',
    conf: 0.91,
    report: 'Standing water hazard detected across transit lane. Drainage clearance requested.',
    sensors: { dist1: 50.0, dist2: 40.0, dist3: 45.0, ldr_value: 1800, water_level: 2850, ir_triggered: false }
  },
  {
    type: 'garbage',
    trigger: 'periodic_scan',
    severity: 'Medium',
    conf: 0.89,
    report: 'Civic solid waste accumulation encroaching onto curb lane.',
    sensors: { dist1: 28.0, dist2: 45.0, dist3: 50.0, ldr_value: 2400, water_level: 80, ir_triggered: false }
  },
  {
    type: 'streetlight_fault',
    trigger: 'low_light_area',
    severity: 'Medium',
    conf: 0.86,
    report: 'Abnormal illumination deficit detected on municipal thoroughfare.',
    sensors: { dist1: 180.0, dist2: 120.0, dist3: 130.0, ldr_value: 280, water_level: 40, ir_triggered: false }
  },
  {
    type: 'faded_marking',
    trigger: 'periodic_scan',
    severity: 'Low',
    conf: 0.83,
    report: 'Faded pedestrian crosswalk and lane markings detected.',
    sensors: { dist1: 110.0, dist2: 100.0, dist3: 95.0, ldr_value: 2200, water_level: 30, ir_triggered: false }
  }
];

async function seedHazards() {
  console.log('Seeding demo hazards into storage...');
  const STATUSES = ['Detected', 'Assigned', 'In Progress', 'Resolved'];

  for (let i = 0; i < 15; i++) {
    const t = randomChoice(TEMPLATES);
    const city = randomChoice(CITIES);
    const lat = jitter(city.lat, 0.02);
    const lng = jitter(city.lon, 0.02);
    const id = uuidv4();
    const created = new Date(Date.now() - Math.floor(Math.random() * 5 * 86400000)).toISOString();

    const doc = {
      id,
      rover_id: randomChoice(['ROVER-001', 'ROVER-002']),
      trigger_reason: t.trigger,
      latitude: lat,
      longitude: lng,
      altitude: 560,
      gps_fixed: true,
      satellites: 7,
      sensor_data: t.sensors,
      image_url: t.type === 'pothole'
        ? `http://localhost:5000/uploads/pothole-${(i % 5) + 1}.jpg`
        : t.type === 'garbage'
        ? `http://localhost:5000/uploads/garbage-${(i % 5) + 1}.jpg`
        : t.type === 'faded_marking'
        ? `http://localhost:5000/uploads/faded-marking-${(i % 5) + 1}.jpg`
        : `http://localhost:5000/uploads/pothole-${(i % 5) + 1}.jpg`,
      estimated_severity: t.severity,
      severity: t.severity,
      status: randomChoice(STATUSES),
      processing_status: 'processed',
      location_key: `${lat.toFixed(3)}_${lng.toFixed(3)}`,
      created_at: created,
      updated_at: created,
      ai_hazard_type: t.type,
      ai_confidence: t.conf,
      ai_severity: t.severity,
      ai_report: t.report,
      cluster_info: { zone_id: (i % 3) + 1, severity_score: t.severity === 'High' ? 0.9 : 0.65 },
      trend_info: { direction: 'stable', risk_level: t.severity, slope: 0.02, predicted_count: 2 },
      is_anomaly: t.severity === 'High',
      anomaly_score: t.severity === 'High' ? -0.3 : 0.4,
      anomaly_flags: t.severity === 'High' ? ['Telemetry threshold alert'] : [],
      processed_at: created
    };

    await storageAdapter.saveHazard(doc);
  }

  console.log('✓ Successfully seeded 15 realistic hazard records.');
}

if (require.main === module) {
  seedHazards().then(() => {
    console.log('Done!');
    process.exit(0);
  });
}

module.exports = { seedHazards };
