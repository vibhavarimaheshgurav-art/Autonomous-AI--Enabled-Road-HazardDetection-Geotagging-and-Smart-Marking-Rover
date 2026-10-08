/**
 * routes/administrative.js
 * Dynamic administrative data endpoints: States, Districts, Talukas, ULBs, Wards
 */

const express = require('express');
const router = express.Router();

const ADMINISTRATIVE_DATA = {
  "Maharashtra": {
    "Pune": {
      talukas: ["Haveli", "Pune City", "Khed", "Baramati", "Shirur", "Maval", "Bhor", "Daund"],
      ulbs: [
        { name: "Pune Municipal Corporation (PMC)", lgd_code: "274850" },
        { name: "Pimpri Chinchwad Municipal Corporation (PCMC)", lgd_code: "274851" },
        { name: "Pune Cantonment Board", lgd_code: "274852" }
      ],
      wards: [
        "Ward 1 - Shivajinagar",
        "Ward 2 - Kothrud",
        "Ward 3 - Fergusson College Rd",
        "Ward 4 - Viman Nagar",
        "Ward 5 - Hadapsar",
        "Ward 6 - Baner & Balewadi",
        "Ward 7 - Deccan Gymkhana",
        "Ward 8 - Kasba Peth"
      ]
    },
    "Mumbai City": {
      talukas: ["Mumbai City", "Colaba", "Byculla", "Dadar"],
      ulbs: [
        { name: "Brihanmumbai Municipal Corporation (BMC)", lgd_code: "274801" }
      ],
      wards: ["Ward A (Colaba)", "Ward B (Sandhurst Rd)", "Ward C (Marine Lines)", "Ward D (Malabar Hill)", "Ward G-North (Dadar)"]
    },
    "Mumbai Suburban": {
      talukas: ["Andheri", "Kurla", "Borivali"],
      ulbs: [
        { name: "Brihanmumbai Municipal Corporation (BMC)", lgd_code: "274801" }
      ],
      wards: ["Ward K-East (Andheri E)", "Ward K-West (Andheri W)", "Ward H-West (Bandra W)", "Ward R-South (Kandivali)"]
    },
    "Thane": {
      talukas: ["Thane", "Kalyan", "Ulhasnagar", "Bhiwandi"],
      ulbs: [
        { name: "Thane Municipal Corporation (TMC)", lgd_code: "274830" },
        { name: "Kalyan-Dombivli Municipal Corporation (KDMC)", lgd_code: "274835" }
      ],
      wards: ["Ward 1 - Naupada", "Ward 2 - Majiwada", "Ward 3 - Vartak Nagar", "Ward 4 - Kopri"]
    },
    "Nagpur": {
      talukas: ["Nagpur Urban", "Nagpur Rural", "Kamptee", "Hingna"],
      ulbs: [
        { name: "Nagpur Municipal Corporation (NMC)", lgd_code: "274900" }
      ],
      wards: ["Ward 1 - Dharampeth", "Ward 2 - Laxmi Nagar", "Ward 3 - Hanuman Nagar"]
    }
  },
  "Karnataka": {
    "Bengaluru Urban": {
      talukas: ["Bengaluru North", "Bengaluru South", "Bengaluru East", "Anekal"],
      ulbs: [
        { name: "Bruhat Bengaluru Mahanagara Palike (BBMP)", lgd_code: "292100" }
      ],
      wards: ["Ward 112 - Domlur", "Ward 150 - Bellandur", "Ward 174 - HSR Layout", "Ward 177 - JP Nagar", "Ward 146 - Lakkasandra"]
    },
    "Mysuru": {
      talukas: ["Mysuru", "Nanjangud", "Hunsur", "T. Narasipura"],
      ulbs: [
        { name: "Mysuru City Corporation (MCC)", lgd_code: "292200" }
      ],
      wards: ["Ward 1 - Chamundi Hill", "Ward 2 - Gokulam", "Ward 3 - Kuvempunagar"]
    }
  },
  "Delhi": {
    "New Delhi": {
      talukas: ["Chanakyapuri", "Connaught Place", "Parliament Street"],
      ulbs: [
        { name: "New Delhi Municipal Council (NDMC)", lgd_code: "070100" },
        { name: "Municipal Corporation of Delhi (MCD)", lgd_code: "070200" }
      ],
      wards: ["Ward 1 - CP Area", "Ward 2 - Khan Market", "Ward 3 - Lodhi Colony"]
    },
    "Central Delhi": {
      talukas: ["Karol Bagh", "Kotwali", "Civil Lines"],
      ulbs: [
        { name: "Municipal Corporation of Delhi (MCD)", lgd_code: "070200" }
      ],
      wards: ["Ward 14 - Karol Bagh", "Ward 18 - Rajinder Nagar", "Ward 22 - Daryaganj"]
    }
  },
  "Gujarat": {
    "Ahmedabad": {
      talukas: ["Ahmedabad City", "Daskroi", "Sanand"],
      ulbs: [
        { name: "Ahmedabad Municipal Corporation (AMC)", lgd_code: "240100" }
      ],
      wards: ["Ward 1 - Navrangpura", "Ward 2 - Bodakdev", "Ward 3 - Satellite", "Ward 4 - Paldi"]
    },
    "Surat": {
      talukas: ["Surat City", "Chorasi", "Olpad"],
      ulbs: [
        { name: "Surat Municipal Corporation (SMC)", lgd_code: "240200" }
      ],
      wards: ["Ward 1 - Athwa", "Ward 2 - Rander", "Ward 3 - Katargam"]
    }
  }
};

// GET /api/administrative/states
router.get('/states', (req, res) => {
  res.json({
    success: true,
    states: Object.keys(ADMINISTRATIVE_DATA)
  });
});

// GET /api/administrative/districts?state=...
router.get('/districts', (req, res) => {
  const { state } = req.query;
  if (!state || !ADMINISTRATIVE_DATA[state]) {
    return res.status(400).json({ success: false, message: 'Invalid or missing state' });
  }
  res.json({
    success: true,
    state,
    districts: Object.keys(ADMINISTRATIVE_DATA[state])
  });
});

// GET /api/administrative/talukas?state=...&district=...
router.get('/talukas', (req, res) => {
  const { state, district } = req.query;
  const stateData = ADMINISTRATIVE_DATA[state];
  if (!stateData || !stateData[district]) {
    return res.status(400).json({ success: false, message: 'Invalid state or district' });
  }
  res.json({
    success: true,
    talukas: stateData[district].talukas,
    ulbs: stateData[district].ulbs,
    wards: stateData[district].wards
  });
});

// GET /api/administrative/all-hierarchy
router.get('/all-hierarchy', (req, res) => {
  res.json({
    success: true,
    data: ADMINISTRATIVE_DATA
  });
});

module.exports = router;
