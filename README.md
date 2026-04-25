# 🚛 SmartDispatch IoT

## 🌟 Overview
**SmartDispatch** is an advanced IoT-based waste management solution designed to optimize city-wide garbage collection. By utilizing real-time ultrasonic sensing and intelligent routing algorithms, the system ensures that trucks only visit bins that actually need emptying—reducing fuel consumption, CO2 emissions, and urban traffic.

---

## 🚀 Key Features

### 🗺️ Intelligent Route Dispatcher
A dynamic routing engine that identifies bins above 70% capacity and generates an optimized travel path for the collection fleet.

### 📊 Real-time Analytics Dashboard
- **Eco-Stats**: Live tracking of fuel saved and CO2 reduction.
- **Weekly Trends**: Visualized fill-level patterns using interactive charts.
- **Smart Alerts**: Real-time critical notifications for full bins and sensor errors.

### ⚙️ System Architecture Visualization
An integrated technical section that explains the hardware stack (HC-SR04, NodeMCU, Servo) with animated data-flow diagrams.

---

## 🛠️ Technical Stack
- **Frontend**: React.js + Vite
- **Styling**: Vanilla CSS (Premium Glassmorphism Design)
- **Charts**: Recharts (Animated SVG)
- **Maps**: React Leaflet + OpenStreetMap
- **Icons**: Lucide-React
- **Hardware Simulation**: Dynamic State-driven Sensor Logic

---

## 📂 Project Structure
```bash
├── src/
│   ├── assets/       # Media and image assets
│   ├── App.jsx       # Main application logic & UI
│   ├── index.css     # Global styles & Animations
│   └── main.jsx      # React entry point
├── public/           # Static icons & favicons
└── package.json      # Project dependencies
```

---

## 🔌 Getting Started
1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/SmartDispatch-IoT.git
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Run the dashboard**
   ```bash
   npm run dev
   ```

---

## 💡 How It Works
1. **Sensing**: Ultrasonic sensors measure the distance from the lid to the waste.
2. **Logic**: `Fill % = ((Total Depth - Distance) / Total Depth) * 100`
3. **Transmission**: Data is transmitted via Wi-Fi to the central dashboard.
4. **Optimization**: The system triggers a "Dispatch" only when bins reach the critical threshold (>70%).

---

<p align="center">
  Developed for SEM 6 Project Portfolio • 2026
</p>
