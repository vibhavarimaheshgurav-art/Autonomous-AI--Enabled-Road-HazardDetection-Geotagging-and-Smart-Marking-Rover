# Smart Civic Hazard Monitoring Rover — Complete Project Documentation

## SECTION 1 — PROJECT OVERVIEW

### 1.1 Project Name
Smart Civic Hazard Monitoring Rover System

### 1.2 One-line explanation
A self-driving rover that uses an onboard camera and AI to automatically detect, map, and report road hazards like potholes and garbage to a web dashboard.

### 1.3 Problem being solved
Road hazards (like potholes, faded road markings, and garbage) are dangerous for drivers and pedestrians, but city municipalities often struggle to find and fix them quickly because they rely on slow manual inspections or citizen complaints.

### 1.4 Why this problem matters
Unrepaired potholes cause accidents and vehicle damage. Faded road markings cause traffic confusion. Garbage causes hygiene issues. Automating the discovery of these issues saves time, money, and potentially lives.

### 1.5 Proposed solution
A small autonomous or remote-controlled rover equipped with a camera and sensors. As it drives around, it takes pictures, uses Artificial Intelligence (AI) to recognize hazards, gets the GPS location, and sends this data to a central system so authorities can see exactly where the problems are on a map.

### 1.6 What the complete system is supposed to do
The complete system is supposed to drive around, capture video, detect 5 types of hazards (potholes, garbage, faded markings, encroachments, and vehicles) in real-time, record the exact GPS coordinates, upload the data via Wi-Fi to a backend server, display the hazards on an interactive web dashboard for city officials, and physically mark the hazard on the ground (e.g., with spray paint).

### 1.7 What the current implementation actually does
Based on the repository, the system successfully trains an AI model to recognize 3 main classes (pothole, garbage, faded road marking). It has a fully functional web backend (Node.js) that can receive hazard reports, and a React frontend dashboard that displays them on a map. It has a Python orchestrator (`main.py`) that can run the AI model on a computer's webcam. It also has firmware for an ESP32 microcontroller to capture data. 

### 1.8 Current limitations
- **Hardware Integration**: The physical rover hardware (motors, GPS, spray paint) is programmed in the firmware (`rover_firmware.ino`) but relies on physical assembly to actually move.
- **AI Model Accuracy**: The current AI model (YOLOv8) was trained on a limited dataset and early-stopped, meaning it might miss some hazards or falsely detect others in real-world messy conditions.
- **Classes**: While 5 classes are mentioned in some files, the final dataset configuration (`data.yaml`) only contains 3 classes.

---

## SECTION 2 — EXPLAIN THE PROJECT USING A SIMPLE REAL-LIFE EXAMPLE

Imagine a small, remote-controlled toy car. We tape a smartphone (or a small camera like an ESP32-CAM) to its roof. 

1. **Rover starts**: You turn on the rover and it starts driving down your street.
2. **Camera captures image**: The camera constantly takes pictures of the road ahead.
3. **Image is processed**: The picture is sent to the brain of the system (the AI model).
4. **AI model detects a problem**: The AI looks at the picture and says, "Aha! I am 85% sure that dark circle is a **pothole**."
5. **Location is obtained**: The rover checks its GPS sensor and says, "I am currently at latitude 12.97, longitude 77.59."
6. **Data is sent to backend**: The rover connects to the internet (via Wi-Fi) and sends a message to our server: "I found a pothole at these coordinates, and here is the picture."
7. **Backend processes it**: The server receives the message, saves it in a database, and calculates how severe the pothole is based on sensor data.
8. **Dashboard displays the result**: A city official sitting in an office opens a website. They see a map with a red pin. They click the pin and see the picture of the pothole.
9. **Physical marking**: (If the physical hardware is attached), the rover sprays a burst of biodegradable neon paint on the road next to the pothole so repair crews can easily spot it later.

---

## SECTION 3 — COMPLETE SYSTEM ARCHITECTURE

`Rover Hardware (ESP32/Camera) → AI Inference (Python/YOLO) → Backend API (Node.js) → Database (Firebase/Local) → Web Dashboard (React)`

1. **Rover Hardware (ESP32 / Camera / Sensors)**
   - **What is it?** The physical robot moving on the street.
   - **Why needed?** To physically reach the locations and capture real-world data.
   - **File:** `esp32-firmware/rover_firmware.ino`
   - **Outputs:** Images, GPS coordinates, sensor readings.

2. **AI Inference (Python / YOLOv8)**
   - **What is it?** The brain that looks at pictures and identifies objects.
   - **Why needed?** Without it, the rover just takes dumb pictures. The AI turns pictures into structured data ("Pothole detected").
   - **File:** `ml-pipeline/models/yolo_model.py` and `main.py`
   - **Outputs:** Bounding boxes (coordinates of the object in the image), class name (e.g., "pothole"), and confidence score.

3. **Backend API (Node.js)**
   - **What is it?** The middleman server that receives data from the rover/AI and saves it.
   - **Why needed?** The rover can't talk directly to the official's web browser. It needs a central post office to store the messages.
   - **File:** `backend/server.js`
   - **Outputs:** Saves data to database, serves data to frontend.

4. **Database (Firebase / Local JSON)**
   - **What is it?** The digital filing cabinet.
   - **Why needed?** To remember where all the potholes are even after the rover is turned off.
   - **File:** Managed via `backend/config/firebase.js` or local JSON.
   - **Outputs:** Stored hazard records.

5. **Web Dashboard (React)**
   - **What is it?** The website the user looks at.
   - **Why needed?** To present the raw database text as a beautiful, interactive map.
   - **File:** `dashboard/src/App.jsx`
   - **Outputs:** Visual maps, tables, and images on a screen.

---

## SECTION 4 — EVERY TECHNOLOGY EXPLAINED FROM ZERO

### Python
**What is Python?** Python is a very popular, easy-to-read programming language. It reads almost like plain English.
**Why is Python used in this project?** It is the undisputed king of Artificial Intelligence and Machine Learning. Almost all AI tools (like PyTorch and YOLO) are built for Python.
**What exactly does Python do here?** It trains the AI model (`ml-pipeline/train.py`) and runs the camera feed to detect hazards (`main.py`).
**Why Python instead of C?** Writing an AI in C would take months and be extremely complex. Python has pre-built libraries that do it in a few lines of code.

### Node.js (JavaScript on the server)
**What is Node.js?** Normally, JavaScript runs *inside* your web browser to make websites interactive. Node.js allows JavaScript to run on a server computer instead.
**Why is Node.js used in this project?** It handles the Backend API (`backend/server.js`). It receives the hazard reports from the rover and saves them.
**Why not use Python for the backend too?** You could! But Node.js is very fast at handling thousands of quick internet requests (like uploading images), and it uses JavaScript, which makes it easy to share code with the React frontend.

### React (JavaScript on the frontend)
**What is React?** A tool made by Facebook to build websites by putting together "components" (like Lego blocks). 
**Why is React used?** It builds the Dashboard (`dashboard/src/App.jsx`). It allows the website to update the map instantly when a new pothole is found without refreshing the page.
**Why React instead of plain HTML/CSS?** Plain HTML is static (it doesn't change). React makes the website dynamic and interactive.

### YOLO (You Only Look Once)
**What is YOLO?** A specific Artificial Intelligence algorithm designed specifically to find objects inside images extremely fast.
**Why is YOLO used?** Because the rover is moving, the AI needs to process images in real-time (in milliseconds). YOLO is famous for being incredibly fast.
**Where is it used?** `ml-pipeline/models/yolo_model.py`.

### ESP32 and Arduino
**What is ESP32?** A tiny, cheap ($5) programmable computer chip that has built-in Wi-Fi and Bluetooth. 
**Why is it used?** It is the brain of the physical rover (`esp32-firmware/rover_firmware.ino`). It controls the motors and reads the sensors.
**Why not put a full laptop on the rover?** A laptop is too big, too expensive, and uses too much battery. The ESP32 is perfect for a small robot.

---

## SECTION 5 — WHY EACH TECHNOLOGY WAS CHOSEN

| Technology | What it is | Where used | Why used | Alternative | Why alternative was not used |
| --- | --- | --- | --- | --- | --- |
| **Python** | Easy programming language | `ml-pipeline/` | Standard language for AI/ML | Java / C++ | Too complex for quick AI development |
| **YOLOv8** | Fast Object Detection AI | `ml-pipeline/train.py` | Fastest real-time detection | Faster R-CNN | More accurate but too slow for real-time edge devices |
| **Node.js** | Server framework | `backend/server.js` | Fast asynchronous handling of HTTP requests | Python Flask | *(Inferred)* Developer likely preferred JavaScript for web servers |
| **React** | Web UI library | `dashboard/src/` | Interactive, component-based maps | Plain HTML | Too difficult to manage dynamic data updates |
| **ESP32** | Microcontroller | `esp32-firmware/` | Built-in Wi-Fi, low cost | Arduino UNO | Arduino UNO doesn't have built-in Wi-Fi |

---

## SECTION 6 — PROGRAMMING LANGUAGES

### Python vs C/C++
- **Python** is used for the AI (`main.py`). It is slow but has amazing AI libraries.
- **C/C++** is used for the hardware firmware (`rover_firmware.ino`). It is extremely fast and talks directly to the electrical pins controlling the motors. You cannot easily run complex AI on a basic C microcontroller, and you cannot easily control hardware pins from standard Python on a PC.

### JavaScript vs Python
- **Python** is used for the heavy mathematical AI thinking.
- **JavaScript** is used for the internet communication (Node.js) and the visual website (React). JavaScript was literally invented for the web, so it dominates web development.

---

## SECTION 7 — COMPLETE FOLDER AND FILE EXPLANATION

| File/Folder | Purpose | Why it exists | Inputs | Outputs |
| --- | --- | --- | --- | --- |
| `main.py` | The orchestrator | It can start the AI, the backend, and the frontend all at once, or run a test camera. | Commands from terminal | Starts servers, prints logs |
| `ml-pipeline/` | AI training code | Holds everything related to making the AI smart. | Datasets | Trained model (`best.pt`) |
| `ml-pipeline/train.py` | AI trainer | This is the script that actually teaches the AI. | Images and labels | `weights/best.pt` |
| `backend/` | The Server | Receives data from the rover and saves it. | HTTP POST requests | Database entries |
| `backend/server.js` | Main server file | The entry point that starts listening for internet traffic. | Web traffic | JSON responses |
| `dashboard/` | The Website | The React application the city official sees. | Data from backend API | Visual web page |
| `esp32-firmware/`| Hardware code | The C++ code uploaded to the physical robot. | Sensor electrical signals | Motor movements, Wi-Fi requests |

---

## SECTION 8 — DATASET EXPLANATION

**What is a dataset?** A collection of examples used to teach the AI. Like giving a child a book with 100 pictures of dogs so they learn what a dog looks like.
**What is an annotation?** A text file that tells the AI exactly *where* in the picture the object is. 
**What is a bounding box?** A rectangle drawn around the object (e.g., drawing a box around a pothole).

- **Location:** `ml-pipeline/dataset_final/`
- **Total Images:** 5,200 for training, 1,485 for validation, 744 for testing.
- **Classes (Categories):** 3 classes: `0: pothole`, `1: garbage`, `2: faded_road_marking`.
- **Format:** Images are JPG/PNG. Annotations are text files (.txt) in YOLO format (each line has the class number and 4 numbers representing the box coordinates).
- **Train/Validation/Test:** 
  - **Train:** Images used to teach the AI.
  - **Validation:** Images used to test the AI *during* training to see if it's learning.
  - **Test:** Images used *after* training is completely finished to give a final score.
- **Configuration:** `dataset_final/data.yaml` tells the YOLO AI where to find these folders.

---

## SECTION 9 — AI/ML MODEL EXPLANATION

### Beginner Concepts
- **Artificial Intelligence (AI):** Making computers do things that usually require human intelligence (like seeing).
- **Machine Learning (ML):** Teaching a computer by showing it examples, rather than programming strict rules.
- **Computer Vision:** Giving computers "eyes" to understand images.
- **Epoch:** One complete pass through the entire training dataset. 
- **Inference:** When the trained AI looks at a *brand new* image and makes a guess.

### Project Specifics
- **Model Architecture:** YOLOv8 (specifically `yolov8n.pt` - Nano version, or `yolov8s.pt` - Small version).
- **Training Script:** `ml-pipeline/train.py`
- **Hardware Used:** The code logs show it was trained on an NVIDIA RTX 3050 Laptop GPU.
- **Epochs:** The code was set to 100 epochs, but previously early-stopped at 28. (Early stopping means the AI realized it wasn't getting any smarter, so it quit early to save time).
- **Outputs:** It produces a file called `best.pt`. This file is the "brain" — it contains all the mathematical knowledge the AI learned.

---

## SECTION 10 — MODEL PERFORMANCE

Based on the actual logs found in the project (`results.csv` and `results.json`):

- **mAP@50 (Accuracy metric):** **64.7%**. This means when the AI finds a hazard, it is moderately accurate. For a production system, you usually want this above 80%.
- **Precision:** 66.6%. When the AI says "this is a pothole", it is correct 66% of the time.
- **Recall:** 60.8%. Out of all the *actual* potholes on the road, the AI successfully finds 60% of them (and misses 40%).

**Is this reliable?** 
It is a good prototype, but not reliable enough for a real city yet. It misses 4 out of 10 hazards. To improve this, the AI needs to be trained for more epochs, on a larger model (`yolov8s.pt`), and ideally with actual photos taken from the rover's specific camera angle.

---

## SECTION 11 — COMPLETE TRAINING PIPELINE

`Raw Images → Dataset Final → train.py → YOLOv8 Algorithm → best.pt`

1. **Dataset Final:** Images are placed in `ml-pipeline/dataset_final/images/train`.
2. **Configuration:** `data.yaml` points to these images.
3. **Training (`train.py`):** The script loads the YOLOv8 algorithm. It feeds the images to YOLO one by one. YOLO guesses where the pothole is. It compares its guess to the text file annotation. It calculates its error (Loss) and adjusts its math to do better next time.
4. **Validation:** After every epoch, it checks itself on the validation folder.
5. **Output:** It saves the smartest version of its brain to `ml-pipeline/weights/best.pt`.

---

## SECTION 12 — INFERENCE / DETECTION PIPELINE

How the system detects a hazard in real life:

**Concept:** Inference
**File:** `main.py` (Specifically the `run_standalone_inference` function)

1. **Camera Frame:** Python connects to the webcam using OpenCV (`cv2.VideoCapture`).
2. **Model Prediction:** The image is passed to the AI: `result = yolo.predict_image(pil_img)`.
3. **Confidence Check:** The system checks if the AI's confidence is above the threshold (e.g., `confidence >= 0.55`).
4. **Decision:** If it is a `pothole`, the code sets a directive: `DECELERATE_STOP`. If it's `garbage`, it sets `SCAN_AND_MARK`.
5. **Dashboard/Action:** The code draws a bounding box on the screen and prints the command. (In the full system, this command is sent to the ESP32 hardware).

---

## SECTION 13 — BACKEND

**What is a backend?** It is the hidden server that manages data. If the dashboard is the "storefront", the backend is the "warehouse manager".

- **Framework:** Express.js (on Node.js).
- **Main File:** `backend/server.js`
- **Database:** MongoDB (using Mongoose in `Hazard.js`) and Firebase.

| Method | Endpoint | Purpose | Input | File |
| --- | --- | --- | --- | --- |
| `GET` | `/api/health` | Checks if the system is alive | None | `server.js` |
| `POST` | `/api/hazard-report` | Rover uses this to submit a found pothole | Image, GPS, Sensor data | `routes/hazardReport.js` |
| `GET` | `/api/hazards` | Dashboard uses this to get all potholes | None | `routes/hazards.js` |

---

## SECTION 14 — DATABASE

**What is a database?** A digital ledger that saves information permanently.
**Why needed?** So that when you restart the computer, the previously found potholes don't disappear.

**Implementation:**
**File:** `backend/models/Hazard.js`
The database stores "Documents" (like rows in a spreadsheet). 
Columns include:
- `hazard_type` (String: Pothole, Garbage, etc.)
- `severity` (String: Low, Medium, High)
- `latitude` / `longitude` (Numbers for GPS)
- `sensor_values` (Distance from ultrasonic sensor)
- `image_base64` (The actual picture)

---

## SECTION 15 — FRONTEND / DASHBOARD

**What is frontend?** The visual part of the software that humans interact with.

- **Technology:** React.js
- **Main File:** `dashboard/src/App.jsx`
- **How it works:** The dashboard loads up. It immediately makes an HTTP `GET` request to the Backend (`/api/hazards`). The backend replies with a JSON list of all hazards. React takes that list and loops through it, placing a visual Pin on a Google Map / Leaflet Map for every coordinate.
- **Authentication:** It uses Firebase Auth (see `dashboard/src/contexts/AuthContext.jsx`) so only authorized city officials can log in.

---

## SECTION 16 — HARDWARE

Based on `esp32-firmware/rover_firmware.ino` and `arduino_sensor_controller.ino`:

| Hardware | What it is | What it detects/controls |
| --- | --- | --- |
| **ESP32** | The main microcontroller | Connects to Wi-Fi, acts as the brain of the robot. |
| **Ultrasonic Sensor** | Shoots sound waves to measure distance | Used to measure how deep a pothole is, or if there is an obstacle in front. |
| **GPS Module** | Talks to satellites | Gets Latitude and Longitude. |
| **Motor Driver (L298N)** | An electrical switch for motors | Makes the wheels spin forward, backward, left, right. |

*(Inferred note: The repository implies the existence of a camera on the rover, likely an ESP32-CAM, to take the pictures that are sent to the backend).*

---

## SECTION 17 — ROVER WORKING

1. **Power:** The rover turns on.
2. **Sensors:** The ESP32 reads the GPS to get its location.
3. **Camera & AI:** The camera captures an image. *(Note: depending on the physical setup, the image is either processed on a laptop/server, or sent to the backend. ESP32s are generally too weak to run YOLOv8 onboard. The architecture implies the ESP32 sends the image to the backend, which forwards it to the Python ML microservice).*
4. **Communication:** The ESP32 makes an HTTP POST request over Wi-Fi to the backend's `/api/hazard-report` endpoint.
5. **Database:** The backend saves it.
6. **Dashboard:** The React app updates the map.

**Status:**
- **Implemented:** The backend API, the AI Python scripts, the React dashboard, the ESP32 code to read sensors and send HTTP requests.
- **Requires physical hardware:** You need the actual motors, wheels, and ESP32 wired up to see the physical rover move.

---

## SECTION 18 — PHYSICAL MARKING / ACTION SYSTEM

**Is it implemented?** 
The project *mentions* a "Physical Marking Rover" in the titles. There is code in `main.py` that generates a directive: `SCAN_AND_MARK`. However, the physical hardware mechanism (like a servo motor pressing a spray paint can) depends on how you physically build the robot. The software sends the *command* to mark it, but the physical spray relies on your hardware assembly.

---

## SECTION 19 — APIs AND EXTERNAL SERVICES

- **Firebase:** Used for database storage and user login on the dashboard. Controlled via environment variables (`.env`).
- **Telegram (Optional):** The backend `server.js` has code to check for `TELEGRAM_BOT_TOKEN`. This is used to send automatic text message alerts to a phone when a critical hazard is found.

---

## SECTION 20 — END-TO-END DATA FLOW

“A camera sees a pothole.”

1. **Hardware:** The ESP32 camera takes a JPEG image.
2. **Network:** The ESP32 uses Wi-Fi to send a POST request to `http://<backend-ip>:5000/api/hazard-report`.
3. **Backend Routing:** `backend/server.js` receives this. It forwards the image to the Python AI service.
4. **AI Inference:** `ml-pipeline/models/yolo_model.py` loads the image, runs it through `best.pt`, and outputs: `{"class": "pothole", "confidence": 0.85}`.
5. **Database Logic:** `backend/models/Hazard.js` receives this result. Because it's a pothole, it sets `severity: 'High'`. It saves this to MongoDB/Firebase.
6. **Frontend Update:** The city official's browser asks the backend for updates. It receives the new pothole coordinates and draws a red pin on the map.

---

## SECTION 21 — CODE WALKTHROUGH

**File:** `main.py`
**Purpose:** This is the master control script.
**Important Logic:**
- `run_full_stack()`: This function literally types terminal commands for you. It starts the Python AI, then starts the Node.js backend (`npm run dev`), then starts the React frontend (`npm run dev`). This is a convenience feature so you don't have to open 3 separate terminal windows.
- `run_standalone_inference()`: This turns on your laptop webcam (`cv2.VideoCapture(0)`), passes frames to YOLO, and draws boxes on your screen. This is amazing for testing the AI without needing the physical rover.

---

## SECTION 22 — HOW TO RUN THE PROJECT

**Assuming Windows:**

1. **Install Python and Node.js** from their official websites.
2. **Open Terminal in the project folder.**
3. **Install Python dependencies:**
   `cd ml-pipeline`
   `pip install -r requirements.txt`
4. **Install Backend dependencies:**
   `cd ../backend`
   `npm install`
5. **Install Frontend dependencies:**
   `cd ../dashboard`
   `npm install`
6. **Run everything at once:**
   Go back to the main folder and run:
   `python main.py`
   *(This will launch the AI, Backend, and Frontend automatically!)*

---

## SECTION 23 — COMMON ERRORS

- **Problem:** `ultralytics is not installed`
  - **Why:** You forgot to install Python packages.
  - **Fix:** Run `pip install -r requirements.txt` in the ml-pipeline folder.
- **Problem:** `EADDRINUSE: address already in use :::5000`
  - **Why:** The backend server is already running in another window.
  - **Fix:** Close other terminals or restart your computer.
- **Problem:** AI says "Dataset images not found" during training.
  - **Why:** YOLO is getting confused by relative folder paths.
  - **Fix:** Use the absolute path (e.g., `D:/MPROJECT/ml-pipeline/dataset_final`) in `data.yaml`.

---

## SECTION 24 — WHAT I SHOULD SAY IN MY PROJECT VIVA

**“What is your project?”**
My project is an autonomous system that uses an AI-powered rover to drive on roads, visually detect hazards like potholes and garbage using computer vision, and automatically plot them on a web dashboard for municipal authorities.

**“Why did you choose Python?”**
Python is the industry standard for Machine Learning. It allowed me to use the YOLOv8 library easily, which would have been incredibly difficult in Java or C++.

**“How was the model trained?”**
I collected a dataset of road hazards, annotated them with bounding boxes, and trained a YOLOv8 Neural Network. I trained it for several epochs on a GPU, and the model learned to recognize the visual patterns of potholes versus garbage.

**“How does the rover communicate with the backend?”**
The rover uses an ESP32 microcontroller with built-in Wi-Fi. It sends HTTP POST requests containing the image and GPS coordinates to my Node.js backend server.

---

## SECTION 25 — GLOSSARY

- **Backend:** The hidden server that processes data.
- **Frontend:** The visual website the user clicks on.
- **YOLO:** "You Only Look Once" - a very fast AI for finding objects in images.
- **Epoch:** One complete training cycle over the dataset.
- **ESP32:** A cheap microchip with Wi-Fi used to control the physical robot.
- **JSON:** A standard text format for sending data across the internet. Looks like `{ "pothole": true }`.
- **Inference:** When the AI uses its training to make a guess on a new image.

---

## SECTION 26 — “IF YOU CHANGE THIS, WHAT BREAKS?”

| Component changed | What may break |
| --- | --- |
| Renaming classes in `data.yaml` | The backend will crash because `Hazard.js` strictly expects exactly "Pothole", "Garbage", etc. |
| Changing port in `server.js` | The dashboard won't be able to fetch data, and the ESP32 won't be able to upload data. |
| Deleting `best.pt` | The AI will fall back to a dumb "dummy mode" or base YOLO model, failing to find potholes. |

---

## SECTION 27 — ACTUAL PROJECT STATUS

- **Fully implemented:** AI Training pipeline, Node.js Backend API, Database schema, React Dashboard UI.
- **Partially implemented:** The physical rover. The firmware code exists, but it requires physical wiring and hardware assembly to actually drive.
- **Potential bugs:** The AI model's accuracy is currently ~64%, meaning it will sometimes make mistakes in real-world lighting.

---

## SECTION 28 — FINAL “TEACH ME THIS PROJECT IN 10 MINUTES”

Think of this project as a **Digital Road Inspector**.

Normally, humans drive around looking for potholes. 
We replaced the human with a **Camera** and an **AI Brain (YOLOv8)**.
We put that camera on a **Robot (ESP32 Rover)**.
When the robot sees a pothole, it asks the **GPS** where it is.
It uses Wi-Fi to text that location to our **Server (Node.js)**.
The server saves it in a **Filing Cabinet (Database)**.
A city worker opens a **Website (React)** and sees a map filled with red pins showing exactly where they need to send repair trucks.

It is a complete, end-to-end Internet of Things (IoT) + Artificial Intelligence system!
