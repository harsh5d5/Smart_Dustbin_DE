import cv2
import numpy as np
import requests
import time

API_URL = "http://localhost:3001/api/bins/1/mesh"
IMAGE_PATH = "test1.png"

def main():
    print("Camera-based Depth Sender started (minimal).")
    
    while True:
        # Load grayscale depth map
        depth_image = cv2.imread(IMAGE_PATH, cv2.IMREAD_GRAYSCALE)
        if depth_image is None:
            print(f"Error: Could not load '{IMAGE_PATH}'")
            time.sleep(2.0)
            continue
            
        h, w = depth_image.shape
        
        
        depth_float = 1.0 - (depth_image.astype(np.float32) / 255.0)
        
       
        crop = 20
        depth_cropped = depth_float[crop:h-crop, crop:w-crop]
        h_c, w_c = depth_cropped.shape
        
        mask = np.zeros_like(depth_cropped, dtype=np.uint8)
        center = (w_c // 2, h_c // 2)
        radius = int(min(h_c, w_c) * 0.45)
        cv2.circle(mask, center, radius, 255, -1)
        depth_cropped[mask == 0] = 0.0
        
       
        depth_smooth = cv2.GaussianBlur(depth_cropped, (9, 9), 0)
        
        
        max_height = 0.9  # 1.0m total bin depth - 0.1m limit headroom
        h_filled = depth_smooth * max_height
        avg_filled_h = float(np.mean(h_filled[mask == 255]))
        max_filled_h = float(np.max(h_filled))
        fill_percentage = (avg_filled_h / max_height) * 100
  
        step = max(1, max(h_c, w_c) // 18)
        X, Y = np.meshgrid(np.arange(w_c), np.arange(h_c))
        X_sub = X[::step, ::step]
        Y_sub = Y[::step, ::step]
        Z_sub = depth_smooth[::step, ::step]
        Z_scaled = Z_sub * (max(h_c, w_c) * 0.4)
        
        # Colorize and generate HUD overlay image
        preview_color = cv2.applyColorMap((depth_smooth * 255).astype(np.uint8), cv2.COLORMAP_VIRIDIS)
        cv2.circle(preview_color, center, radius, (255, 255, 255), 2)
        cv2.putText(preview_color, "LID CAMERA NODE 1", (15, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
        cv2.putText(preview_color, f"Total Depth: 1.00m", (15, h_c - 75), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (220, 220, 220), 1)
        cv2.putText(preview_color, f"Avg Filled H: {avg_filled_h:.2f}m", (15, h_c - 55), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (52, 211, 153), 1)
        cv2.putText(preview_color, f"Max Peak H: {max_filled_h:.2f}m", (15, h_c - 35), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (239, 68, 68), 1)
        cv2.putText(preview_color, f"Fill Level: {fill_percentage:.1f}%", (15, h_c - 15), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (253, 224, 71), 1)
        
        # Save image directly to client public folder
        cv2.imwrite('../client/public/depth_live_1.png', preview_color)
        
        # Post metrics payload to Node.js server
        payload = {
            "x": X_sub.tolist(),
            "y": Y_sub.tolist(),
            "z": Z_scaled.tolist(),
            "fillPercentage": float(fill_percentage),
            "averageHeight": avg_filled_h,
            "maxHeight": max_filled_h
        }
        
        try:
            res = requests.post(API_URL, json=payload, timeout=2.0)
            if res.status_code == 200:
                print(f"Sent: Fill {fill_percentage:.1f}% | Avg H: {avg_filled_h:.2f}m | Max H: {max_filled_h:.2f}m")
        except requests.exceptions.RequestException:
            print("Server offline. Retrying...")
            
        time.sleep(1.5)

if __name__ == "__main__":
    main()
