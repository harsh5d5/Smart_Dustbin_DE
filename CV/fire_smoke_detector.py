import cv2
import numpy as np
import requests
import time

try:
    import winsound
except ImportError:
    winsound = None

API_ALERTS_URL = "http://localhost:3001/api/alerts"
IMAGE_PATH = "test1.png"

def detect_fire_and_smoke(frame):
    # Convert image to HSV space
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    
    # HSV Fire ranges (orange/red/yellow)
    lower_fire = np.array([10, 100, 100], dtype=np.uint8)
    upper_fire = np.array([28, 255, 255], dtype=np.uint8)
    lower_fire_red = np.array([170, 100, 100], dtype=np.uint8)
    upper_fire_red = np.array([180, 255, 255], dtype=np.uint8)
    
    fire_mask1 = cv2.inRange(hsv, lower_fire, upper_fire)
    fire_mask2 = cv2.inRange(hsv, lower_fire_red, upper_fire_red)
    fire_mask = cv2.add(fire_mask1, fire_mask2)
    
    # HSV Smoke ranges (gray/white tones)
    lower_smoke = np.array([0, 0, 80], dtype=np.uint8)
    upper_smoke = np.array([180, 40, 220], dtype=np.uint8)
    smoke_mask = cv2.inRange(hsv, lower_smoke, upper_smoke)
    
    # Compute active pixel ratios
    total_pixels = frame.shape[0] * frame.shape[1]
    has_fire = (cv2.countNonZero(fire_mask) / total_pixels) > 0.02
    has_smoke = (cv2.countNonZero(smoke_mask) / total_pixels) > 0.06
    
    return has_fire, has_smoke

def main():
    print("Fire & Smoke Detector started.")
    
    cap = cv2.VideoCapture(0)
    use_cam = cap.isOpened()
    
    if not use_cam:
        print("Camera not found. Monitoring 'test1.png' in simulation loop.")
        
    while True:
        if use_cam:
            ret, frame = cap.read()
            if not ret:
                time.sleep(1.0)
                continue
        else:
            frame = cv2.imread(IMAGE_PATH)
            if frame is None:
                print(f"Error: Could not load '{IMAGE_PATH}'")
                time.sleep(2.0)
                continue
                
        fire, smoke = detect_fire_and_smoke(frame)
        
        if fire or smoke:
            alert_type = "fire" if fire else "smoke"
            msg = f"EMERGENCY: {alert_type.upper()} DETECTED inside container space!"
            print(f"[ALERT] {msg}")
            
            # Sound hardware warning buzzer
            if winsound:
                winsound.Beep(3000, 800)
                
            # Submit ticket to the server alerts feed
            try:
                requests.post(API_ALERTS_URL, json={
                    "type": alert_type,
                    "message": msg,
                    "binId": 1
                }, timeout=1.5)
            except Exception:
                pass
                
        time.sleep(1.0)

if __name__ == "__main__":
    main()
