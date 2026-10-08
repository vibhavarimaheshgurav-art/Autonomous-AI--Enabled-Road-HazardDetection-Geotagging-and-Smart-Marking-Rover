# 🛣️ Autonomous Smart Civic Hazard Monitoring Rover

An end-to-end IoT & Data Science engineering platform for civic road hazard detection.
Hardware rovers capture telemetry and video frames, transmitting them to a **Node.js Express + Firebase** backend, where a **5-Layer Python AI/ML Microservice** performs automated computer vision detection, geospatial hotspot clustering, trend regression, anomaly isolation, and LLM generative report authoring, presented on a real-time **React Google Maps Dashboard**.

---

## 🏛️ System Architecture

```
┌────────────────────────┐
│  ESP32-CAM Rover       │
│  (Ultrasonic, LDR,     │
│   Water, GPS, OV2640)  │
└──────────┬─────────────┘
           │ HTTP POST (Multipart Image + JSON Sensor Telemetry)
           ▼
┌────────────────────────────────────────────────────────┐
│  Node.js + Express Backend Server (:5000)              │
│  ├─ Firebase Storage (Hazard Image CDN)                │
│  ├─ Firestore DB (Real-time NoSQL Documents)           │
│  ├─ In-Process Async AI Job Queue                      │
│  └─ Telegram Bot (High-Severity Alert Notifications)   │
└──────────┬─────────────────────────────────────────────┘
           │ HTTP Async RPC
           ▼
┌────────────────────────────────────────────────────────┐
│  Python FastAPI ML Pipeline (:8000)                    │
│  ├─ Layer 1: YOLOv8 (Road Hazard Computer Vision)      │
│  ├─ Layer 2: K-Means (Geospatial Hotspot Clustering)  │
│  ├─ Layer 3: Ridge Regression (Time-Series Trends)     │
│  ├─ Layer 4: IsolationForest (Sensor Anomaly Filter)   │
│  └─ Layer 5: Generative LLM (Municipal Civic Briefs)   │
└────────────────────────────────────────────────────────┘
           ▲
           │ REST API / Firebase Auth Token
┌──────────┴─────────────────────────────────────────────┐
│  React.js + Vite Dashboard (:5173)                     │
│  ├─ Google Maps API (Colored Severity Pins)            │
│  ├─ K-Means Hotspot Translucent Overlay                │
│  ├─ Slide-In AI Telemetry & Ticket Detail Panel        │
│  └─ Role-Based Access Control (Citizen / Officer / Admin)│
└────────────────────────────────────────────────────────┘
```

---

## 📁 Monorepo Layout

```
d:\MPROJECT\
├── backend/               # Node.js + Express + Firebase Admin + Telegram Bot
├── ml-pipeline/           # Python FastAPI + 5-Layer AI Pipeline + YOLOv8 Training
├── dashboard/             # React + Vite + Tailwind CSS + Google Maps Dashboard
├── firmware-notes/        # ESP32 Payload Contract & Arduino HTTP Examples
├── esp32-firmware/        # ESP32 Arduino sketch
└── .env.example           # Master environment variable reference
```

---

## 🚀 Local Development Setup

Run the 3 services in separate terminal tabs:

### 1️⃣ Python AI Microservice (Port 8000)
```bash
cd ml-pipeline
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env with your GEMINI_API_KEY (free at https://aistudio.google.com/)

python main.py
# Running at http://localhost:8000 (Docs at http://localhost:8000/docs)
```

### 2️⃣ Node.js Backend (Port 5000)
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with Firebase and Telegram keys

npm run dev
# Running at http://localhost:5000
```

### 3️⃣ React Web Dashboard (Port 5173)
```bash
cd dashboard
npm install
cp .env.example .env
# Add your VITE_GOOGLE_MAPS_API_KEY & Firebase config

npm run dev
# Running at http://localhost:5173
```

---

## 🧠 Swapping in Custom Fine-Tuned YOLOv8 Weights

The ML service is designed to start immediately using `yolov8n.pt` (pre-trained COCO fallback) so you can test the end-to-end pipeline with zero delay.

Once you are ready to train on a dataset (such as **RDD2022** or a **Roboflow Pothole Detection** export):

1. **Prepare Dataset**: Place your dataset with annotations in `ml-pipeline/dataset/` and configure `data.yaml`.
2. **Run Training**:
   ```bash
   cd ml-pipeline
   python train.py --epochs 50 --batch 16 --data data.yaml --model yolov8n.pt
   ```
3. **Automatic Deployment**: `train.py` automatically copies the best weights to `ml-pipeline/weights/best.pt`.
4. **Restart**: Restart `python main.py`. It will detect and log:
   ```
   ✓ Loading fine-tuned YOLOv8 model from weights/best.pt
   ```

---

## 📡 Hardware / Firmware Contract

See the complete contract in [firmware-notes/PAYLOAD_CONTRACT.md](firmware-notes/PAYLOAD_CONTRACT.md).
Endpoint: `POST http://<backend-ip>:5000/api/hazard-report`

---

## 🔐 Role-Based Access Control (RBAC)

- **Citizen View (Guest / Public)**: Interactive map, pin inspection, AI brief read-only.
- **Municipal Officer**: Can update ticket workflow status (`Detected` ➔ `Assigned` ➔ `In Progress` ➔ `Resolved`) and log maintenance notes.
- **System Administrator**: Full access, including the administrative ticket dispatch portal.
