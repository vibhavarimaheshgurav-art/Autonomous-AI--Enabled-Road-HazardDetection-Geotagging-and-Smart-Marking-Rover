/**
 * server.js — Smart Civic Hazard Rover Backend (Self-Diagnosing & Plug-and-Play)
 * Binds to 0.0.0.0 for ESP32-CAM local Wi-Fi connectivity.
 */

require('dotenv').config();
const os = require('os');
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const { initializeFirebase, isFirebaseActive } = require('./config/firebase');
const { startWorker } = require('./services/aiWorker');

// Initialize Firebase
initializeFirebase();

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

// ─── Middleware ──────────────────────────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serve local uploads statically for offline/local storage mode
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Request logger
app.use((req, _res, next) => {
  if (req.path !== '/api/health' && req.path !== '/health') {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
  }
  next();
});

// ─── Routes ──────────────────────────────────────────────────
app.use('/api/hazard-report', require('./routes/hazardReport'));
app.use('/api/hazards', require('./routes/hazards'));
app.use('/api/hazards', require('./routes/status'));
app.use('/api/administrative', require('./routes/administrative'));
app.use('/api/auth', require('./routes/authExtended'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/config', require('./routes/config'));

// ─── Pipeline Health & Diagnostics Endpoint ──────────────────
async function getPipelineHealth() {
  const weightsPath = path.join(__dirname, '..', 'ml-pipeline', 'weights', 'best.pt');
  const weightsExist = fs.existsSync(weightsPath);
  const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';

  let mlServiceAlive = false;
  let mlDetails = null;

  try {
    const resp = await axios.get(`${mlServiceUrl}/health`, { timeout: 1500 });
    mlServiceAlive = resp.status === 200;
    mlDetails = resp.data;
  } catch (e) {
    mlServiceAlive = false;
  }

  const telegramConfigured = Boolean(
    process.env.TELEGRAM_BOT_TOKEN &&
    process.env.TELEGRAM_CHAT_ID &&
    !process.env.TELEGRAM_BOT_TOKEN.includes('123456789')
  );

  return {
    status: 'healthy',
    backend: {
      status: 'online',
      version: '3.0.0',
      uptime_seconds: Math.floor(process.uptime()),
      host_binding: `${HOST}:${PORT}`,
      local_ip: getLocalIpAddress()
    },
    database: {
      engine: isFirebaseActive() ? 'Firebase Firestore' : 'Local Disk JSON (data/hazards.json)',
      firebase_active: isFirebaseActive(),
      storage_engine: isFirebaseActive() ? 'Firebase Cloud Storage' : 'Local Storage (/uploads)'
    },
    ml_pipeline: {
      service_status: mlServiceAlive ? 'online' : 'offline (using fallback classifier)',
      service_url: mlServiceUrl,
      fine_tuned_weights_found: weightsExist,
      weights_path: 'ml-pipeline/weights/best.pt',
      microservice_meta: mlDetails
    },
    telegram_alerts: {
      configured: telegramConfigured,
      status: telegramConfigured ? 'active' : 'disabled (optional)'
    },
    hardware_contract: {
      endpoint: `http://${getLocalIpAddress()}:${PORT}/api/hazard-report`,
      method: 'POST',
      enctype: 'multipart/form-data',
      ready_for_esp32: true
    }
  };
}

app.get(['/api/health', '/health'], async (_req, res) => {
  try {
    const health = await getPipelineHealth();
    res.json(health);
  } catch (err) {
    res.status(500).json({ status: 'degraded', error: err.message });
  }
});

// Root documentation endpoint
app.get('/', async (_req, res) => {
  const health = await getPipelineHealth();
  res.json({
    name: 'Smart Civic Hazard Monitoring Rover — Central Ingestion Backend',
    version: '3.0.0',
    local_wifi_ip: getLocalIpAddress(),
    esp32_post_url: `http://${getLocalIpAddress()}:${PORT}/api/hazard-report`,
    endpoints: {
      hardware_post: 'POST /api/hazard-report  (multipart/form-data)',
      get_hazards: 'GET  /api/hazards',
      get_summary: 'GET  /api/hazards/analytics/summary',
      get_single: 'GET  /api/hazards/:id',
      update_status: 'PUT  /api/hazards/:id/status',
      health_check: 'GET  /api/health'
    },
    pipeline_diagnostics: health
  });
});

// ─── 404 & Error Handling ────────────────────────────────────
app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use((err, _req, res, _next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

// Helper to discover host IP on local Wi-Fi for ESP32
function getLocalIpAddress() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

// ─── Self-Diagnosing Startup Checklist Banner ─────────────────
async function runStartupDiagnostics() {
  const localIp = getLocalIpAddress();
  const weightsPath = path.join(__dirname, '..', 'ml-pipeline', 'weights', 'best.pt');
  const weightsExist = fs.existsSync(weightsPath);
  const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';

  let mlServiceAlive = false;
  try {
    const resp = await axios.get(`${mlServiceUrl}/health`, { timeout: 1200 });
    mlServiceAlive = resp.status === 200;
  } catch (e) {
    mlServiceAlive = false;
  }

  const telegramConfigured = Boolean(
    process.env.TELEGRAM_BOT_TOKEN &&
    process.env.TELEGRAM_CHAT_ID &&
    !process.env.TELEGRAM_BOT_TOKEN.includes('123456789')
  );

  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║        SMART CIVIC HAZARD ROVER — BACKEND SELF-DIAGNOSTIC            ║');
  console.log('╠══════════════════════════════════════════════════════════════════════╣');
  console.log(`║  🌐 Local Wi-Fi Host IP:   http://${localIp}:${PORT}`.padEnd(71) + '║');
  console.log(`║  📡 ESP32 Ingestion URL:   http://${localIp}:${PORT}/api/hazard-report`.padEnd(71) + '║');
  console.log('╠──────────────────────────────────────────────────────────────────────╣');
  console.log('║  SYSTEM COMPONENT STATUS:                                            ║');

  // Firebase
  if (isFirebaseActive()) {
    console.log('║  [✅] Firebase Cloud Firestore & Storage : CONNECTED (Live Cloud)   ║');
  } else {
    console.log('║  [ℹ️] Database Storage Engine             : LOCAL DISK (hazards.json)║');
  }

  // YOLO weights
  if (weightsExist) {
    console.log('║  [✅] Fine-Tuned YOLOv8 Weights (best.pt): FOUND & READY            ║');
  } else {
    console.log('║  [ℹ️] Fine-Tuned YOLOv8 Weights (best.pt): NOT FOUND (Using Fallback)║');
  }

  // ML Microservice
  if (mlServiceAlive) {
    console.log('║  [✅] Python AI Microservice (port 8000) : ONLINE & HEALTHY          ║');
  } else {
    console.log('║  [ℹ️] Python AI Microservice (port 8000) : STANDALONE FALLBACK MODE  ║');
  }

  // Telegram
  if (telegramConfigured) {
    console.log('║  [✅] Telegram Emergency Alerts Bot      : CONFIGURED                ║');
  } else {
    console.log('║  [ℹ️] Telegram Emergency Alerts Bot      : DISABLED (Optional)       ║');
  }

  console.log('╠──────────────────────────────────────────────────────────────────────╣');
  console.log('║  READY FOR ESP32-CAM: Power on your rover to start logging reports!  ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');
}

// ─── Start Server ────────────────────────────────────────────
app.listen(PORT, HOST, async () => {
  startWorker();
  await runStartupDiagnostics();
});

process.on('SIGINT', () => { console.log('\nShutting down gracefully...'); process.exit(0); });
module.exports = app;
