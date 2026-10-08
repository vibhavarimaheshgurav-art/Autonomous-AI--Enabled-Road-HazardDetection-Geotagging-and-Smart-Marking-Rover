/**
 * routes/authExtended.js
 * Captcha, OTP generation/validation, Officer Registration, Citizen Registration
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const USERS_FILE = path.join(__dirname, '..', 'data', 'registered_users.json');
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, '[]', 'utf8');
}

// In-memory stores for OTPs and Captchas (with 10-minute expiry)
const otpStore = new Map();
const captchaStore = new Map();

// Helper to generate clean readable captcha
function generateCaptcha() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let text = '';
  for (let i = 0; i < 6; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const token = uuidv4();
  captchaStore.set(token, {
    text: text.toUpperCase(),
    expires: Date.now() + 10 * 60 * 1000
  });
  return { token, text };
}

// GET /api/auth/captcha
router.get('/captcha', (req, res) => {
  const captcha = generateCaptcha();
  res.json({
    success: true,
    captchaToken: captcha.token,
    captchaText: captcha.text, // Frontend renders visually in SVG canvas
    expiresInSeconds: 600
  });
});

// POST /api/auth/verify-captcha
router.post('/verify-captcha', (req, res) => {
  const { captchaToken, captchaInput } = req.body;
  if (!captchaToken || !captchaInput) {
    return res.status(400).json({ success: false, message: 'Captcha token and input required' });
  }

  const record = captchaStore.get(captchaToken);
  if (!record) {
    return res.status(400).json({ success: false, message: 'Captcha expired or invalid. Please refresh.' });
  }

  if (Date.now() > record.expires) {
    captchaStore.delete(captchaToken);
    return res.status(400).json({ success: false, message: 'Captcha expired. Please reload.' });
  }

  const isValid = record.text.trim().toUpperCase() === captchaInput.trim().toUpperCase();
  if (isValid) {
    captchaStore.delete(captchaToken);
    return res.json({ success: true, message: 'Captcha verified successfully' });
  } else {
    return res.status(400).json({ success: false, message: 'Incorrect captcha characters' });
  }
});

// POST /api/auth/send-otp
router.post('/send-otp', (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, message: 'Valid email address required' });
  }

  // Generate 6-digit numeric OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(email.toLowerCase(), {
    otp,
    expires: Date.now() + 10 * 60 * 1000,
    verified: false
  });

  console.log(`[OTP Verification] Generated OTP for ${email}: ${otp}`);

  res.json({
    success: true,
    message: `6-digit OTP code sent to ${email}`,
    // Simulated demo delivery for instant classroom/demo verification
    demoOtpHint: otp
  });
});

// POST /api/auth/verify-otp
router.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Email and OTP required' });
  }

  const record = otpStore.get(email.toLowerCase());
  if (!record) {
    return res.status(400).json({ success: false, message: 'No OTP requested for this email' });
  }

  if (Date.now() > record.expires) {
    otpStore.delete(email.toLowerCase());
    return res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });
  }

  if (record.otp === otp.trim()) {
    record.verified = true;
    return res.json({ success: true, message: 'Email OTP verified successfully' });
  } else {
    return res.status(400).json({ success: false, message: 'Invalid OTP code' });
  }
});

// Helper to save registered user
function saveUser(userObj) {
  let users = [];
  try {
    users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch (e) {
    users = [];
  }
  users.push(userObj);
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

// POST /api/auth/register-officer
router.post('/register-officer', (req, res) => {
  const {
    fullName,
    email,
    password,
    state,
    district,
    taluka,
    location, // { lat, lng }
    ulbName,
    lgdCode,
    wardNumber,
    captchaToken,
    captchaInput
  } = req.body;

  // Validation
  if (!state || !district || !taluka) {
    return res.status(400).json({ success: false, message: 'State, District, and Taluka are required' });
  }
  if (!ulbName) {
    return res.status(400).json({ success: false, message: 'ULB name is required' });
  }
  if (!lgdCode || !/^\d{4,8}$/.test(String(lgdCode).trim())) {
    return res.status(400).json({ success: false, message: 'LGD Code must be a valid 4-8 digit numeric code' });
  }
  if (!wardNumber) {
    return res.status(400).json({ success: false, message: 'Ward number is required' });
  }
  if (!location || location.lat == null || location.lng == null) {
    return res.status(400).json({ success: false, message: 'Live GPS location is required. Please share GPS location.' });
  }

  // Verify captcha if provided
  if (captchaToken) {
    const cap = captchaStore.get(captchaToken);
    if (!cap || cap.text !== String(captchaInput || '').trim().toUpperCase()) {
      return res.status(400).json({ success: false, message: 'Invalid captcha verification' });
    }
    captchaStore.delete(captchaToken);
  }

  const officerUser = {
    id: `officer-${uuidv4().slice(0, 8)}`,
    role: 'officer',
    fullName: fullName || 'Municipal Field Officer',
    email: email || `officer.${lgdCode}@civic.gov.in`,
    state,
    district,
    taluka,
    location: {
      latitude: parseFloat(location.lat),
      longitude: parseFloat(location.lng)
    },
    ulbName,
    lgdCode: String(lgdCode).trim(),
    wardNumber,
    registeredAt: new Date().toISOString()
  };

  saveUser(officerUser);

  res.status(201).json({
    success: true,
    message: 'Municipal Officer registered successfully',
    user: officerUser,
    redirectTo: '/portal'
  });
});

// POST /api/auth/register-citizen
router.post('/register-citizen', (req, res) => {
  const {
    email,
    otp,
    state,
    district,
    taluka,
    location // { lat, lng }
  } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, message: 'Valid email address is required' });
  }
  if (!otp) {
    return res.status(400).json({ success: false, message: 'OTP verification is required' });
  }
  const otpRecord = otpStore.get(email.toLowerCase());
  if (!otpRecord || otpRecord.otp !== String(otp).trim()) {
    return res.status(400).json({ success: false, message: 'Incorrect OTP code. Please verify email.' });
  }

  if (!state || !district || !taluka) {
    return res.status(400).json({ success: false, message: 'State, District, and Taluka are required' });
  }
  if (!location || location.lat == null || location.lng == null) {
    return res.status(400).json({ success: false, message: 'Live GPS location is required. Please share location.' });
  }

  const citizenUser = {
    id: `citizen-${uuidv4().slice(0, 8)}`,
    role: 'citizen',
    email: email.toLowerCase(),
    state,
    district,
    taluka,
    location: {
      latitude: parseFloat(location.lat),
      longitude: parseFloat(location.lng)
    },
    registeredAt: new Date().toISOString()
  };

  saveUser(citizenUser);
  otpStore.delete(email.toLowerCase());

  res.status(201).json({
    success: true,
    message: 'Citizen registered successfully',
    user: citizenUser,
    redirectTo: '/portal'
  });
});

module.exports = router;
