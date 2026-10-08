# Backend Server - Road Hazard Detection

Node.js + Express + MongoDB backend API for hazard data collection and management.

## Project Structure

```
backend/
├── server.js              # Main server file
├── package.json          # Dependencies
├── .env.example          # Environment variables template
├── models/
│   └── Hazard.js        # MongoDB Hazard schema
├── routes/
│   └── hazards.js       # API routes
└── README.md            # This file
```

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4 or higher)
- npm or yarn

## Installation

### 1. Install Node.js

**Windows:**
- Download from: https://nodejs.org/
- Choose LTS version
- Run installer and follow prompts

**Linux/Mac:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Install MongoDB

**Windows:**
- Download from: https://www.mongodb.com/try/download/community
- Run MSI installer
- MongoDB should start as system service

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

**Mac:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

### 3. Verify MongoDB is Running

```bash
# Connect to MongoDB shell
mongosh

# Or older version
mongo

# Should show: MongoDB shell version
```

### 4. Install Backend Dependencies

```bash
cd backend
npm install
```

This will install:
- express
- mongoose
- cors
- dotenv
- express-validator
- moment

## Configuration

### 1. Copy Environment File

```bash
cp .env.example .env
```

### 2. Edit .env File

```bash
# For local MongoDB (no changes needed if running locally)
PORT=5000
MONGODB_URI=mongodb://localhost:27017/road-hazard-detection
NODE_ENV=development
```

### 3. For MongoDB Atlas (Cloud)

If using cloud MongoDB:

1. Create account: https://www.mongodb.com/cloud/atlas
2. Create cluster (free tier available)
3. Get connection string (looks like):
   ```
   mongodb+srv://username:password@cluster.mongodb.net/road-hazard-detection?retryWrites=true&w=majority
   ```
4. Update .env:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/road-hazard-detection?retryWrites=true&w=majority
   ```

## Running the Server

### Production Mode

```bash
npm start
```

### Development Mode (with auto-reload)

```bash
npm install --save-dev nodemon  # Install first if not done
npm run dev
```

You should see:
```
================================
Backend Server Started
================================
✓ Server running on: http://localhost:5000
✓ API endpoints available at: http://localhost:5000/
✓ MongoDB connected to: mongodb://localhost:27017/road-hazard-detection

Tips:
- Test with: curl http://localhost:5000/health
- Post hazard: POST http://localhost:5000/hazard
- Get hazards: GET http://localhost:5000/hazards/list
================================
```

## API Endpoints

### 1. Health Check
```bash
GET /health

Response:
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "database": "Connected"
}
```

### 2. Create Hazard Report
```bash
POST /hazard
Content-Type: application/json

{
  "hazard_type": "Pothole",
  "sensor_values": {
    "distance_cm": 15,
    "light_level": 2000,
    "water_detected": false
  },
  "latitude": 28.6139,
  "longitude": 77.2090,
  "timestamp": "2024-01-15T10:30:00Z",
  "image_base64": "iVBORw0KGgoAAAANSUhEUgAAAAUA...",
  "device_id": "ESP32-001"
}

Response:
{
  "success": true,
  "message": "Hazard report created successfully",
  "hazard": {
    "_id": "6708a1b2c3d4e5f6g7h8i9j0",
    "hazard_type": "Pothole",
    "severity": "medium",
    "status": "Pending",
    "location": {
      "latitude": 28.6139,
      "longitude": 77.2090
    },
    "timestamp": "2024-01-15T10:30:00Z"
  },
  "isDuplicate": false
}
```

### 3. Get All Hazards
```bash
GET /hazards/list?type=Pothole&severity=high&limit=50&offset=0

Query Parameters:
- type: "Pothole", "Malfunctioning Streetlight", "Waterlogging"
- severity: "low", "medium", "high"
- status: "Pending", "In Progress", "Resolved"
- limit: number (default: 100, max: 500)
- offset: number (default: 0)
- sort: "-timestamp" (default) or other fields

Response:
{
  "success": true,
  "data": {
    "hazards": [...],
    "pagination": {
      "total": 45,
      "limit": 50,
      "offset": 0,
      "returned": 45
    }
  }
}
```

### 4. Get Single Hazard
```bash
GET /hazard/:id

Response:
{
  "success": true,
  "hazard": {
    "_id": "6708a1b2c3d4e5f6g7h8i9j0",
    "hazard_type": "Pothole",
    "severity": "medium",
    "status": "Pending",
    "location": {...},
    "sensor_values": {...},
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### 5. Update Hazard Status
```bash
PUT /hazard/:id
Content-Type: application/json

{
  "status": "In Progress",
  "notes": "Repairing pothole",
  "resolved_by": "DPS Team 5"
}

Response:
{
  "success": true,
  "message": "Hazard updated successfully",
  "hazard": {...}
}
```

### 6. Delete Hazard
```bash
DELETE /hazard/:id

Response:
{
  "success": true,
  "message": "Hazard deleted successfully"
}
```

### 7. Get Analytics
```bash
GET /hazards/analytics/summary

Response:
{
  "success": true,
  "analytics": {
    "totalHazards": 156,
    "byType": [
      { "_id": "Pothole", "count": 89 },
      { "_id": "Waterlogging", "count": 34 }
    ],
    "bySeverity": [
      { "_id": "high", "count": 23 },
      { "_id": "medium", "count": 67 }
    ],
    "byStatus": [
      { "_id": "Pending", "count": 45 },
      { "_id": "Resolved", "count": 111 }
    ]
  }
}
```

## Testing with cURL

### Test Server Health
```bash
curl http://localhost:5000/health
```

### Send Test Hazard Data
```bash
curl -X POST http://localhost:5000/hazard \
  -H "Content-Type: application/json" \
  -d '{
    "hazard_type": "Pothole",
    "sensor_values": {
      "distance_cm": 12,
      "light_level": 1800,
      "water_detected": false
    },
    "latitude": 28.6139,
    "longitude": 77.2090,
    "device_id": "ESP32-001"
  }'
```

### Get All Hazards
```bash
curl http://localhost:5000/hazards/list
```

### Get Hazards by Type
```bash
curl "http://localhost:5000/hazards/list?type=Pothole"
```

### Update Hazard Status
```bash
curl -X PUT http://localhost:5000/hazard/HAZARD_ID \
  -H "Content-Type: application/json" \
  -d '{
    "status": "Resolved",
    "resolved_by": "Maintenance Team"
  }'
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| MongoDB connection error | Ensure MongoDB is running: `mongosh` or `sudo systemctl start mongod` |
| Port 5000 already in use | Change PORT in .env or kill process: `lsof -ti:5000 \| xargs kill` |
| Cannot find module | Run `npm install` again |
| CORS errors | Check CORS_ORIGINS in .env matches frontend URL |
| Connection timeout | Check MongoDB URI in .env, ensure correct IP/credentials |

## Database Management

### View Collections
```bash
mongosh
use road-hazard-detection
show collections
```

### View Hazard Data
```bash
db.hazards.find().pretty()
db.hazards.count()
db.hazards.findOne()
```

### Clear All Hazards
```bash
db.hazards.deleteMany({})
```

### Create Index
```bash
db.hazards.createIndex({ "timestamp": -1 })
db.hazards.createIndex({ "location": "2dsphere" })
```

## Performance Tips

1. **Add Database Indexes** (improves query speed):
   ```bash
   db.hazards.createIndex({ "hazard_type": 1 })
   db.hazards.createIndex({ "timestamp": -1 })
   db.hazards.createIndex({ "location": "2dsphere" })
   ```

2. **Limit Image Size**: Keep Base64 images under 10KB for faster transmission

3. **Archive Old Data**: Move resolved hazards older than 30 days to archive collection

4. **Use Pagination**: Always use limit/offset for large result sets

## Production Deployment

### Using PM2 (Process Manager)

```bash
npm install -g pm2
pm2 start server.js --name "hazard-backend"
pm2 save
pm2 startup
```

### Using Docker

```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

### Using Heroku

```bash
heroku login
heroku create your-app-name
git push heroku main
```

## Next Steps

1. Verify backend is running: `curl http://localhost:5000/health`
2. Configure JWT authentication (optional)
3. Connect dashboard frontend
4. Configure ESP32 to send data to backend IP
5. Deploy to production server

## Support & Documentation

- Express.js: https://expressjs.com/
- Mongoose: https://mongoosejs.com/
- MongoDB: https://docs.mongodb.com/

