from ultralytics import YOLO
import cv2
import requests
import time

# Load YOLOv8 nano model (downloads yolov8n.pt automatically on first run)
model = YOLO("yolov8n.pt")

API_BIN_URL = "http://localhost:3001/api/bins/1"

def main():
    print("YOLOv8 Hatch Controller Active.")
    
    cap = cv2.VideoCapture(0)
    use_cam = cap.isOpened()
    
    if not use_cam:
        print("Camera not found. Monitoring 'test1.png' in simulation loop.")
        
    last_status = "closed"
    
    while True:
        if use_cam:
            ret, frame = cap.read()
            if not ret:
                time.sleep(1.0)
                continue
        else:
            frame = cv2.imread("test1.png")
            if frame is None:
                print("Error: test1.png not found.")
                time.sleep(2.0)
                continue
        
        # Run YOLO object detection (verbose=False keeps console clean)
        results = model(frame, verbose=False)
        
        human_detected = False
        for r in results:
            for box in r.boxes:
                class_id = int(box.cls[0])
                label = model.names[class_id]
                if label == "person":
                    human_detected = True
                    break
            if human_detected:
                break
                
        # Lid opens only if human is detected, closed for anything else (animals/cars/etc.)
        status = "open" if human_detected else "closed"
        
        if status != last_status:
            try:
                requests.put(API_BIN_URL, json={"lidStatus": status}, timeout=1.5)
                print(f"Hatch state changed to: {status.upper()}")
                last_status = status
            except Exception:
                print("Server communication error.")
                
        time.sleep(1.0)

if __name__ == "__main__":
    main()
