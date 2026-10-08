"""
main.py — Master Production Entry Point
Autonomous Smart Civic Hazard Monitoring Rover System

Detection classes: pothole | garbage | faded_road_marking | encroachment | vehicle

Provides unified execution, system diagnostics, and standalone edge-inference loops:
  1. python main.py                 # Runs Full Production Stack (AI Microservice + Backend + Dashboard)
  2. python main.py --mode health   # Runs End-to-End System Diagnostics & Port Audits
  3. python main.py --mode test-cam # Standalone live camera inference loop with YOLOv8 & decision engine
"""

import os
import sys
import time
import argparse
import subprocess
import threading
from pathlib import Path

if sys.platform == "win32":
    try:
        import io
        if isinstance(sys.stdout, io.TextIOWrapper):
            sys.stdout.reconfigure(encoding="utf-8")
        if isinstance(sys.stderr, io.TextIOWrapper):
            sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

ROOT_DIR = Path(__file__).resolve().parent
ML_DIR = ROOT_DIR / "ml-pipeline"
BACKEND_DIR = ROOT_DIR / "backend"
DASHBOARD_DIR = ROOT_DIR / "dashboard"
WEIGHTS_PATH = ML_DIR / "weights" / "best.pt"


def banner():
    print("=" * 68)
    print("  AUTONOMOUS SMART CIVIC HAZARD MONITORING ROVER")
    print("  Central Production System Orchestrator v2.1.0")
    print("=" * 68)


def check_environment():
    """Verifies that essential model weights and configurations exist."""
    print("\n[1/4] Auditing Environment & Model Artifacts...")
    if not WEIGHTS_PATH.exists():
        print(f"  ❌ Critical: Fine-tuned model weights not found at: {WEIGHTS_PATH}")
        return False
    print(f"  ✓ Model Weights: {WEIGHTS_PATH} ({WEIGHTS_PATH.stat().st_size / (1024*1024):.2f} MB)")

    # Check Python dependencies
    try:
        import torch
        import ultralytics
        device = "CUDA (" + torch.cuda.get_device_name(0) + ")" if torch.cuda.is_available() else "CPU"
        print(f"  ✓ PyTorch: {torch.__version__} on {device}")
    except ImportError as e:
        print(f"  ⚠️ Warning: {e}")

    # Check Node.js
    try:
        node_ver = subprocess.check_output(["node", "-v"], text=True).strip()
        print(f"  ✓ Node.js Runtime: {node_ver}")
    except Exception:
        print("  ⚠️ Warning: Node.js runtime not found in PATH.")

    return True


def run_health_check():
    """Runs a complete self-diagnostic audit of the system."""
    banner()
    ok = check_environment()
    print("\n[2/4] Verifying ML Microservice Model Loading...")
    try:
        sys.path.insert(0, str(ML_DIR))
        from models.yolo_model import YOLOModel  # type: ignore[import]
        yolo = YOLOModel(str(WEIGHTS_PATH))
        print(f"  ✓ YOLOv8 Initialized: Custom Weights = {yolo.is_custom}")
    except Exception as e:
        print(f"  ❌ ML Initialization Error: {e}")
        ok = False

    print("\n[3/4] Checking Hardware Firmware Artifacts...")
    ino_path = ROOT_DIR / "esp32-firmware" / "rover_firmware.ino"
    cfg_path = ROOT_DIR / "esp32-firmware" / "config.h"
    if ino_path.exists() and cfg_path.exists():
        print(f"  ✓ ESP32 Firmware Source: {ino_path}")
        print(f"  ✓ Synchronized Config Header: {cfg_path}")
    else:
        print("  ❌ Firmware source files missing.")
        ok = False

    print("\n[4/4] Final Verdict:")
    if ok:
        print("  ✅ SYSTEM HEALTH STATUS: OPTIMAL & READY FOR EXECUTION\n")
    else:
        print("  ⚠️ SYSTEM HEALTH STATUS: DEGRADED (Check above warnings)\n")
    return ok


def run_standalone_inference(camera_index=0, conf_threshold=0.55):
    """
    Direct Camera Edge-AI Inference Loop:
    Captures frames -> Runs YOLOv8 -> Computes Navigation Directive -> Logs Output.
    """
    banner()
    print(f"\n[*] Starting Standalone Edge Inference on Camera Source [{camera_index}]...")
    import cv2
    from PIL import Image

    sys.path.insert(0, str(ML_DIR))
    from models.yolo_model import YOLOModel  # type: ignore[import]
    yolo = YOLOModel(str(WEIGHTS_PATH))

    cap = cv2.VideoCapture(camera_index)
    if not cap.isOpened():
        print(f"❌ Error: Cannot open camera source {camera_index}")
        return

    print("✓ Video stream active. Press 'q' in preview window to exit.")
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("⚠️ Camera frame drop. Retrying...")
                time.sleep(0.1)
                continue

            # Convert to PIL Image for inference
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(rgb_frame)

            result = yolo.predict_image(pil_img)
            top_class = result.get("class", "none_detected")
            confidence = result.get("confidence", 0.0)
            detections = result.get("detections", [])

            # Compute Rover Navigation Directive (5-class: pothole, garbage, faded_road_marking, encroachment, vehicle)
            directive = "CRUISE_FORWARD"
            trigger_mark = False

            if confidence >= conf_threshold and top_class != "none_detected":
                if top_class == "pothole":
                    directive = "DECELERATE_STOP"
                    trigger_mark = True
                elif top_class in ["garbage", "faded_road_marking"]:
                    directive = "SCAN_AND_MARK"
                    trigger_mark = True
                elif top_class == "encroachment":
                    directive = "STEER_LEFT"
                elif top_class == "vehicle":
                    directive = "STEER_RIGHT"

            # Draw visual feedback
            for det in detections:
                box = det.get("bbox", [])
                if len(box) == 4:
                    x1, y1, x2, y2 = [int(v) for v in box]
                    cls_name = det.get("class", "")
                    c = det.get("confidence", 0.0)
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255) if cls_name == "pothole" else (0, 255, 0), 2)
                    cv2.putText(frame, f"{cls_name} {c:.2f}", (x1, max(20, y1 - 8)),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)

            # Overlay HUD
            hud_text = f"CMD: {directive} | MARK: {trigger_mark} | DET: {top_class} ({confidence:.2f})"
            cv2.rectangle(frame, (0, 0), (frame.shape[1], 35), (0, 0, 0), -1)
            cv2.putText(frame, hud_text, (10, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)

            cv2.imshow("Smart Civic Hazard Rover — Edge AI Feed", frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
    finally:
        cap.release()
        cv2.destroyAllWindows()
        print("✓ Camera stream closed.")


def start_service(cmd, cwd, name):
    print(f"[*] Starting {name}...")
    proc = subprocess.Popen(cmd, cwd=cwd, shell=True)
    return proc


def run_full_stack():
    """Launches the complete distributed stack: ML microservice, backend API, and web dashboard."""
    banner()
    check_environment()

    print("\n[+] Launching 3 Monorepo Services:")
    print("    1. Python ML Microservice -> http://localhost:8000")
    print("    2. Node.js Ingestion Backend -> http://localhost:5000")
    print("    3. React Web Dashboard     -> http://localhost:5173\n")

    procs = []
    try:
        # 1. Start Python FastAPI ML service
        p_ml = start_service(f'"{sys.executable}" main.py', ML_DIR, "Python FastAPI ML Service (:8000)")
        procs.append(p_ml)
        time.sleep(2)

        # 2. Start Node.js backend
        p_backend = start_service("npm run dev", BACKEND_DIR, "Node.js Ingestion Backend (:5000)")
        procs.append(p_backend)
        time.sleep(2)

        # 3. Start React dashboard
        p_dash = start_service("npm run dev", DASHBOARD_DIR, "React Web Dashboard (:5173)")
        procs.append(p_dash)

        print("\n" + "=" * 68)
        print("  ✓ ALL SERVICES ONLINE! Press Ctrl+C in this terminal to shut down.")
        print("=" * 68 + "\n")

        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[*] Shutting down all rover services gracefully...")
        for p in procs:
            p.terminate()
        print("✓ System shutdown complete.")


def main():
    parser = argparse.ArgumentParser(description="Smart Civic Hazard Rover Production Orchestrator")
    parser.add_argument("--mode", choices=["full", "health", "test-cam"], default="full",
                        help="Execution mode: 'full' (all services), 'health' (diagnostics), 'test-cam' (edge vision loop)")
    parser.add_argument("--cam", type=int, default=0, help="Camera index for 'test-cam' mode (default: 0)")
    parser.add_argument("--conf", type=float, default=0.55, help="Confidence threshold for hazard detection")

    args = parser.parse_args()

    if args.mode == "health":
        run_health_check()
    elif args.mode == "test-cam":
        run_standalone_inference(args.cam, args.conf)
    else:
        run_full_stack()


if __name__ == "__main__":
    main()
