# Test Configuration & Sample Data

## Backend Environment (.env)

Copy from `backend/.env.example` to `backend/.env`:

```ini
# Server Port
PORT=5000

# MongoDB Connection String
MONGODB_URI=mongodb://localhost:27017/road-hazard-detection

# Node Environment
NODE_ENV=development

# CORS Origins
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Image Storage
IMAGE_STORAGE_PATH=./uploads/images

# Session Secret
SESSION_SECRET=your-secret-key-here-change-in-production

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## ESP32 Configuration

Edit `esp32-firmware/rover_firmware.ino`:

```cpp
// WiFi Configuration
const char* SSID = "OPPO Reno8 5G";
const char* PASSWORD = "password8143";

// Backend URL — replace <LAN_IP> with the host machine's local Wi-Fi IP (check
// http://<LAN_IP>:5000/api/health after starting the backend; it prints the IP).
const char* BACKEND_URL = "http://<LAN_IP>:5000/api/hazard-report";

// Sensor Thresholds
#define DISTANCE_THRESHOLD 20       // cm
#define LDR_THRESHOLD 1500           // ADC value
#define SENSOR_READ_INTERVAL 5000    // milliseconds
```

---

## Frontend Configuration

Edit `frontend/app.js`:

```javascript
// Backend Server URL
const API_BASE_URL = 'http://localhost:5000';
// Change to: const API_BASE_URL = 'http://192.168.1.100:5000';

// Auto-refresh interval (milliseconds)
// Current: 10 seconds
setInterval(loadHazards, 10000);  // Change to 5000 for 5 seconds
```

Edit `frontend/index.html` (line ~11):

```html
<!-- Add your Google Maps API key here -->
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY"></script>
```

---

## Test Data Collections

### Collection 1: Potholes in Delhi

```json
[
  {
    "hazard_type": "Pothole",
    "sensor_values": { "distance_cm": 8, "light_level": 2200 },
    "latitude": 28.6139,
    "longitude": 77.2090,
    "device_id": "ESP32-001"
  },
  {
    "hazard_type": "Pothole",
    "sensor_values": { "distance_cm": 15, "light_level": 2500 },
    "latitude": 28.7041,
    "longitude": 77.1025,
    "device_id": "ESP32-001"
  },
  {
    "hazard_type": "Pothole",
    "sensor_values": { "distance_cm": 12, "light_level": 1800 },
    "latitude": 28.5721,
    "longitude": 77.3411,
    "device_id": "ESP32-002"
  }
]
```

### Collection 2: Waterlogging in Multiple Cities

```json
[
  {
    "hazard_type": "Waterlogging",
    "sensor_values": { "distance_cm": 25, "light_level": 1200, "water_detected": true },
    "latitude": 19.0760,
    "longitude": 72.8777,
    "device_id": "ESP32-003"
  },
  {
    "hazard_type": "Waterlogging",
    "sensor_values": { "distance_cm": 20, "light_level": 800, "water_detected": true },
    "latitude": 12.9716,
    "longitude": 77.5946,
    "device_id": "ESP32-004"
  }
]
```

### Collection 3: Streetlight Failures

```json
[
  {
    "hazard_type": "Malfunctioning Streetlight",
    "sensor_values": { "distance_cm": 35, "light_level": 200 },
    "latitude": 28.6292,
    "longitude": 77.2197,
    "device_id": "ESP32-001"
  },
  {
    "hazard_type": "Malfunctioning Streetlight",
    "sensor_values": { "distance_cm": 40, "light_level": 150 },
    "latitude": 28.6355,
    "longitude": 77.2245,
    "device_id": "ESP32-002"
  }
]
```

---

## Test Scripts

### Bash Script for Bulk Insert

Save as `config/test-insert.sh`:

```bash
#!/bin/bash

API_URL="http://localhost:5000/api/hazard-report"
DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)

echo "🚀 Inserting test hazards..."

# Pothole Test Data
echo "📍 Adding potholes..."
for i in 1 2 3; do
  LAT=$(echo "28.6139 + $(shuf -i -1000:1000 -n 1)/100000" | bc)
  LON=$(echo "77.2090 + $(shuf -i -1000:1000 -n 1)/100000" | bc)
  
  curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "{
      \"hazard_type\": \"Pothole\",
      \"sensor_values\": {
        \"distance_cm\": $((RANDOM % 15 + 5)),
        \"light_level\": $((RANDOM % 2000 + 1500))
      },
      \"latitude\": $LAT,
      \"longitude\": $LON,
      \"device_id\": \"ESP32-001\"
    }" > /dev/null
  
  echo "✓ Pothole $i added"
done

# Waterlogging Test Data
echo "🌊 Adding waterlogging..."
for i in 1 2; do
  LAT=$(echo "19.0760 + $(shuf -i -500:500 -n 1)/100000" | bc)
  LON=$(echo "72.8777 + $(shuf -i -500:500 -n 1)/100000" | bc)
  
  curl -s -X POST $API_URL \
    -H "Content-Type: application/json" \
    -d "{
      \"hazard_type\": \"Waterlogging\",
      \"sensor_values\": {
        \"water_detected\": true
      },
      \"latitude\": $LAT,
      \"longitude\": $LON,
      \"device_id\": \"ESP32-003\"
    }" > /dev/null
  
  echo "✓ Waterlogging $i added"
done

# Streetlight Test Data
echo "💡 Adding streetlight failures..."
for i in 1 2; do
  LAT=$(echo "28.6355 + $(shuf -i -1000:1000 -n 1)/100000" | bc)
  LON=$(echo "77.2245 + $(shuf -i -1000:1000 -n 1)/100000" | bc)
  
  curl -s -X POST $API_URL \
    -H "Content-Type: application/json" \
    -d "{
      \"hazard_type\": \"Malfunctioning Streetlight\",
      \"sensor_values\": {
        \"light_level\": $((RANDOM % 500))
      },
      \"latitude\": $LAT,
      \"longitude\": $LON,
      \"device_id\": \"ESP32-002\"
    }" > /dev/null
  
  echo "✓ Streetlight $i added"
done

echo ""
echo "✅ Test data insertion complete!"
echo "📊 View at: http://localhost:3000"
```

Run:
```bash
chmod +x config/test-insert.sh
./config/test-insert.sh
```

### Node.js Test Script

Save as `config/test-data.js`:

```javascript
const fetch = require('node-fetch');

const API_URL = 'http://localhost:5000/api/hazard-report';

const testHazards = [
  {
    hazard_type: 'Pothole',
    sensor_values: { distance_cm: 8, light_level: 2200 },
    latitude: 28.6139,
    longitude: 77.2090,
    device_id: 'ESP32-001'
  },
  {
    hazard_type: 'Waterlogging',
    sensor_values: { water_detected: true },
    latitude: 19.0760,
    longitude: 72.8777,
    device_id: 'ESP32-003'
  },
  {
    hazard_type: 'Malfunctioning Streetlight',
    sensor_values: { light_level: 200 },
    latitude: 28.6292,
    longitude: 77.2197,
    device_id: 'ESP32-002'
  }
];

async function insertTestData() {
  console.log('🚀 Inserting test hazards...\n');

  for (const hazard of testHazards) {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hazard)
      });

      const data = await res.json();
      if (data.success) {
        console.log(`✓ Added ${hazard.hazard_type}`);
      } else {
        console.error(`✗ Failed: ${data.message}`);
      }
    } catch (err) {
      console.error(`✗ Error: ${err.message}`);
    }
  }

  console.log('\n✅ Test data insertion complete!');
}

insertTestData();
```

Run:
```bash
cd config
node test-data.js
```

---

## API Testing Scenarios

### Scenario 1: Full Flow Test

```bash
# 1. Check server health
curl http://localhost:5000/health

# 2. Create first hazard
curl -X POST http://localhost:5000/api/hazard-report \
  -H "Content-Type: application/json" \
  -d '{
    "hazard_type": "Pothole",
    "sensor_values": {"distance_cm": 12},
    "latitude": 28.6139,
    "longitude": 77.2090
  }'

# 3. List all hazards
curl http://localhost:5000/hazards/list

# 4. Get analytics
curl http://localhost:5000/hazards/analytics/summary

# 5. Update status
curl -X PUT http://localhost:5000/hazard/HAZARD_ID \
  -H "Content-Type: application/json" \
  -d '{"status": "Resolved"}'
```

### Scenario 2: Filtering Test

```bash
# Filter by type
curl "http://localhost:5000/hazards/list?type=Pothole"

# Filter by severity
curl "http://localhost:5000/hazards/list?severity=high"

# Filter by status
curl "http://localhost:5000/hazards/list?status=Pending"

# Combine filters
curl "http://localhost:5000/hazards/list?type=Pothole&severity=high&status=Pending"
```

### Scenario 3: Pagination Test

```bash
# Get first 20
curl "http://localhost:5000/hazards/list?limit=20&offset=0"

# Get next 20
curl "http://localhost:5000/hazards/list?limit=20&offset=20"

# Get last 10
curl "http://localhost:5000/hazards/list?limit=10&offset=90"
```

---

## Performance Testing

### Load Test (Using Apache Bench)

```bash
# Install Apache Bench
# MacOS: brew install httpd
# Linux: sudo apt-get install apache2-utils
# Windows: Download from https://httpd.apache.org/

# Test 100 requests with 10 concurrent
ab -n 100 -c 10 http://localhost:5000/health

# Test POST requests
ab -n 50 -c 5 -p test-data.json -T application/json http://localhost:5000/api/hazard-report
```

### Stress Test (Using wrk)

```bash
# Install wrk
# MacOS: brew install wrk
# Linux: Download from https://github.com/wg/wrk

wrk -t4 -c100 -d30s http://localhost:5000/hazards/list
```

---

## Database Testing

### MongoDB Test Queries

```bash
# Connect to MongoDB
mongosh

# Switch to database
use road-hazard-detection

# Count hazards
db.hazards.countDocuments({})

# View all
db.hazards.find().pretty()

# Query by type
db.hazards.find({ hazard_type: "Pothole" })

# Query by severity
db.hazards.find({ severity: "high" })

# Coordinate query (within 1km of point)
db.hazards.find({
  location: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [77.2090, 28.6139]
      },
      $maxDistance: 1000
    }
  }
})

# Delete all test data
db.hazards.deleteMany({})

# Show indexes
db.hazards.getIndexes()
```

---

## Monitoring Checklist

- [ ] Backend server responding to health checks
- [ ] Frontend loads without console errors
- [ ] Google Maps displays correctly
- [ ] Hazards appear as markers on map
- [ ] Analytics numbers update correctly
- [ ] Filters work (type, severity, status)
- [ ] Status updates persist after refresh
- [ ] Export downloads JSON file
- [ ] Can delete hazards successfully
- [ ] MongoDB is storing data correctly

---

## Common Test Issues

| Issue | Solution |
|-------|----------|
| ECONNREFUSED on API calls | Backend not running or wrong URL |
| "Invalid API Key" on map | Google Maps API key not set correctly |
| No markers showing | Check browser console for errors, verify GPS coordinates |
| MongoDB error | Ensure MongoDB is running: `mongosh` |
| CORS errors | Check backend CORS configuration in server.js |

---

## Sign-Off

✅ **All components tested and working**

Next steps:
1. Deploy ESP32 rovers
2. Configure WiFi and backend URL
3. Monitor dashboard for hazards
4. Test with real sensors
5. Deploy to production

---
