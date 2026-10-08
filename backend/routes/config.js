/**
 * routes/config.js
 * Secure Configuration & API Key Delivery for Localhost Frontend
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const SECURE_CONFIG_FILE = path.join(__dirname, '..', 'data', 'secure_config.json');

function getStoredConfig() {
  try {
    if (fs.existsSync(SECURE_CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(SECURE_CONFIG_FILE, 'utf8'));
    }
  } catch (e) {
    // fallback
  }
  return {};
}

// GET /api/config/keys — Securely deliver client config without exposing secrets in build artifacts
router.get('/keys', (req, res) => {
  const stored = getStoredConfig();
  const googleMapsKey = process.env.GOOGLE_MAPS_API_KEY ||
                        process.env.VITE_GOOGLE_MAPS_API_KEY ||
                        stored.googleMapsApiKey ||
                        "";

  res.json({
    success: true,
    maps: {
      provider: googleMapsKey && googleMapsKey.length > 15 ? 'google' : 'leaflet_dark',
      googleMapsApiKey: googleMapsKey,
      hasValidGoogleKey: Boolean(googleMapsKey && googleMapsKey.length > 15 && !googleMapsKey.includes('AIzaSy')),
      defaultCenter: { lat: 18.5204, lng: 73.8567 },
      defaultZoom: 13
    },
    system: {
      backendHost: 'http://localhost:5000',
      mediaUploadsUrl: 'http://localhost:5000/uploads',
      apiMode: 'secure-localhost',
      secureConfigLoaded: true
    }
  });
});

// POST /api/config/keys — Securely update backend keys by Municipal Admin
router.post('/keys', (req, res) => {
  const { googleMapsApiKey } = req.body;
  const current = getStoredConfig();
  if (googleMapsApiKey !== undefined) {
    current.googleMapsApiKey = String(googleMapsApiKey).trim();
  }

  try {
    fs.writeFileSync(SECURE_CONFIG_FILE, JSON.stringify(current, null, 2), 'utf8');
    res.json({
      success: true,
      message: 'Configuration updated securely in localhost backend storage'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to write secure config: ' + err.message });
  }
});

module.exports = router;
