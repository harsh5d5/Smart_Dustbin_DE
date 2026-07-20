import cv2
import numpy as np
import requests
import time
import os

# Windows Motherboard buzzer support
try:
    import winsound
except ImportError:
    winsound = None

API_ALERTS_URL = "http://localhost:3001/api/alerts"
API_BIN_URL = "http://localhost:3001/api/bins/1"
IMAGE_PATH = "test1.png"

# MobileNet SSD Setup parameters (Caffe)
PROTO_URL = "https://raw.githubusercontent.com/chuanqi305/MobileNet-SSD/master/deploy.prototxt"
MODEL_URL = "https://github.com/chuanqi305/MobileNet-SSD/raw/master/mobilenet_iter_73000.caffemodel"

PROTO_FILE = "deploy.prototxt"
MODEL_FILE = "mobilenet_iter_73000.caffemodel"

CLASSES = ["background", "aeroplane", "bicycle", "bird", "boat",
           "bottle", "bus", "car", "cat", "chair", "cow", "diningtable",
           "dog", "horse", "motorbike", "person", "pottedplant", "sheep",
           "sofa", "train", "tvmonitor"]

def download_file(url, output):
    print(f"Downloading model file from {url}...")
    try:
        r = requests.get(url, timeout=10)
        with open(output, 'wb') as f:
            f.write(r.content)
        print("Download complete.")
        return True
    except Exception as e:
        print(f"Failed to download: {e}")
        return False

def init_net():
    # Make sure we are in the CV directory to find model files or download them
    if not os.path.exists(PROTO_FILE):
        download_file(PROTO_URL, PROTO_FILE)
    if not os.path.exists(MODEL_FILE):
        download_file(MODEL_URL, MODEL_FILE)
        
    if os.path.exists(PROTO_FILE) and os.path.exists(MODEL_FILE):
        try:
            net = cv2.dnn.readNetFromCaffe(PROTO_FILE, MODEL_FILE)
            print("Successfully loaded MobileNet SSD network.")
            return net
        except Exception as e:
            print(f"Error reading Caffe network: {e}")
    return None

def detect_fire_and_smoke(frame):
    # Convert to HSV color space for color-based fire detection
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    
    # Fire color range (reddish, orange, yellowish tones)
    lower_fire = np.array([10, 100, 100], dtype=np.uint8)
    upper_fire = np.array([28, 255, 255], dtype=np.uint8)
    
    # Alternate fire range (red wraps around in HSV)
    lower_fire_red = np.array([170, 100, 100], dtype=np.uint8)
    upper_fire_red = np.array([180, 255, 255], dtype=np.uint8)
    
    # Create masks
    mask1 = cv2.inRange(hsv, lower_fire, upper_fire)
    mask2 = cv2.inRange(hsv, lower_fire_red, upper_fire_red)
    fire_mask = cv2.add(mask1, mask2)
    
    # Smoke color range (light gray to dark gray/white with low saturation)
    lower_smoke = np.array([0, 0, 80], dtype=np.uint8)
    upper_smoke = np.array([180, 40, 220], dtype=np.uint8)
    smoke_mask = cv2.inRange(hsv, lower_smoke, upper_smoke)
    
    # Compute pixel counts to check threshold trigger
    fire_pixels = cv2.countNonZero(fire_mask)
    smoke_pixels = cv2.countNonZero(smoke_mask)
    
    # Sensitivity threshold (adjust based on container view size)
    total_pixels = frame.shape[0] * frame.shape[1]
    fire_ratio = fire_pixels / total_pixels
    smoke_ratio = smoke_pixels / total_pixels
    
    has_fire = fire_ratio > 0.02
    has_smoke = smoke_ratio > 0.06
    
    return has_fire, has_smoke

def main():
    net = init_net()
    
    # Fallback to standard HOG descriptor if Caffe model is offline/unavailable
    hog = None
    if net is None:
        print("Falling back to standard OpenCV HOG Person Detector.")
        hog = cv2.HOGDescriptor()
        hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
        
    # Open camera stream (camera index 0). Fallback to image loop if camera is unavailable
    cap = cv2.VideoCapture(0)
    use_cam = cap.isOpened()
    
    if use_cam:
        print("Successfully opened camera stream.")
    else:
        print(f"No active camera found. Running simulation loop on image '{IMAGE_PATH}'.")
        
    last_lid_status = "closed"
    
    while True:
        # 1. Grab image frame
        if use_cam:
            ret, frame = cap.read()
            if not ret:
                print("Failed to grab camera frame.")
                time.sleep(1.0)
                continue
        else:
            frame = cv2.imread(IMAGE_PATH)
            if frame is None:
                print(f"Error: Could not load image '{IMAGE_PATH}'")
                time.sleep(2.0)
                continue
                
        h, w = frame.shape[:2]
        
        # 2. Fire and Smoke Detection
        fire_detected, smoke_detected = detect_fire_and_smoke(frame)
        if fire_detected or smoke_detected:
            # Danger detected! Trigger immediate alarms
            alert_type = "fire" if fire_detected else "smoke"
            alert_msg = f"EMERGENCY: {alert_type.upper()} DETECTED inside container space!"
            print(f"[ALERT] {alert_msg}")
            
            # Sound Windows motherboard buzzer
            if winsound:
                winsound.Beep(3000, 1000)  # 3kHz tone for 1 second
                
            # Send alert notification to the database/backend
            try:
                requests.post(API_ALERTS_URL, json={
                    "type": alert_type,
                    "message": alert_msg,
                    "binId": 1
                }, timeout=1.5)
            except Exception:
                pass
                
        # 3. Object / Human Detection
        human_detected = False
        ignored_classes = []
        
        if net is not None:
            # Process using MobileNet SSD
            blob = cv2.dnn.blobFromImage(cv2.resize(frame, (300, 300)), 0.007843, (300, 300), 127.5)
            net.setInput(blob)
            detections = net.forward()
            
            for i in range(detections.shape[2]):
                confidence = detections[0, 0, i, 2]
                if confidence > 0.45: # confidence threshold
                    idx = int(detections[0, 0, i, 1])
                    label = CLASSES[idx]
                    
                    if label == "person":
                        human_detected = True
                        print(f"Person detected! (Confidence: {confidence * 100:.1f}%)")
                    elif label in ["dog", "cat", "bird", "car", "bus", "train"]:
                        ignored_classes.append(label)
                        
        else:
            # Fallback HOG people detection
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            boxes, weights = hog.detectMultiScale(gray, winStride=(8,8), padding=(8,8), scale=1.05)
            if len(boxes) > 0:
                human_detected = True
                print(f"Person detected via HOG (detections: {len(boxes)})")
                
        # 4. Action Decision Logic
        if human_detected:
            current_lid_status = "open"
        else:
            current_lid_status = "closed"
            if len(ignored_classes) > 0:
                print(f"Ignoring non-human objects: {', '.join(set(ignored_classes))}")
                
        # Update server only if lid status changes to prevent redundant updates
        if current_lid_status != last_lid_status:
            print(f"Lid status changed: {last_lid_status.upper()} -> {current_lid_status.upper()}")
            try:
                requests.put(API_BIN_URL, json={"lidStatus": current_lid_status}, timeout=1.5)
                last_lid_status = current_lid_status
            except Exception:
                print("Could not communicate lid update to server.")
                
        # Sleep for a moment before scanning the next frame
        time.sleep(1.0)

if __name__ == "__main__":
    main()
