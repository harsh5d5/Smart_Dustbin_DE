import React, { useState } from 'react';
import { 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  Map, 
  Bell, 
  Activity,
  Edit2,
  Truck,
  Leaf,
  Cpu
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell 
} from 'recharts';
import { MapContainer, TileLayer, Popup, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import './index.css';

// --- MOCK ANALYTICS DATA ---
const weeklyData = [
  { day: 'Mon', fill: 65 },
  { day: 'Tue', fill: 45 },
  { day: 'Wed', fill: 82 },
  { day: 'Thu', fill: 55 },
  { day: 'Fri', fill: 90 },
  { day: 'Sat', fill: 70 },
  { day: 'Sun', fill: 35 },
];

const fillRateData = [
  { name: 'LD College', rate: 45 },
  { name: 'Law Garden', rate: 88 },
  { name: 'Riverfront', rate: 95 },
  { name: 'Paldi', rate: 20 },
  { name: 'CG Road', rate: 92 },
];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDispatching, setIsDispatching] = useState(false);
  const [truckPosition, setTruckPosition] = useState(null);

  // --- MOCK DATA (Simulating Arduino Sensors) ---
  const [bins, setBins] = useState([
    { id: 1, name: "Bin 01 - LD College", isActive: true, fillPercentage: 29, ultrasonicSensor: "connected", lidStatus: "closed", depth: 30, lat: 23.0350, lng: 72.5464 },
    { id: 2, name: "Bin 02 - Law Garden", isActive: true, fillPercentage: 85, ultrasonicSensor: "connected", lidStatus: "open", depth: 45, lat: 23.0249, lng: 72.5604 },
    { id: 3, name: "Bin 03 - Riverfront", isActive: true, fillPercentage: 95, ultrasonicSensor: "connected", lidStatus: "closed", depth: 30, lat: 23.0210, lng: 72.5714 },
    { id: 4, name: "Bin 04 - Paldi", isActive: false, fillPercentage: 10, ultrasonicSensor: "error", lidStatus: "closed", depth: 30, lat: 23.0115, lng: 72.5550 },
    { id: 5, name: "Bin 05 - Gujarat College", isActive: true, fillPercentage: 75, ultrasonicSensor: "connected", lidStatus: "closed", depth: 40, lat: 23.0215, lng: 72.5570 },
    { id: 6, name: "Bin 06 - CG Road", isActive: true, fillPercentage: 92, ultrasonicSensor: "connected", lidStatus: "open", depth: 35, lat: 23.0320, lng: 72.5560 },
    { id: 7, name: "Bin 07 - Ashram Road", isActive: true, fillPercentage: 40, ultrasonicSensor: "connected", lidStatus: "closed", depth: 30, lat: 23.0300, lng: 72.5700 },
    { id: 8, name: "Bin 08 - Navrangpura", isActive: true, fillPercentage: 15, ultrasonicSensor: "connected", lidStatus: "closed", depth: 40, lat: 23.0380, lng: 72.5510 }
  ]);

  // Calculate dynamic stats based on our mock data
  const totalBins = bins.length;
  const fullBins = bins.filter(bin => bin.fillPercentage >= 90).length;
  const warningBins = bins.filter(bin => bin.fillPercentage >= 70 && bin.fillPercentage < 90).length;
  const normalBins = bins.filter(bin => bin.fillPercentage < 70).length;
  const binsToCollect = bins.filter(bin => bin.fillPercentage >= 70);

  // Helper function for progress bar color logic
  const getProgressBarColor = (percentage) => {
    if (percentage >= 90) return 'fill-red';
    if (percentage >= 70) return 'fill-yellow';
    return 'fill-green';
  };

  // Handle Empty Bin action (simulates truck picking up trash)
  const handleEmptyBin = (id) => {
    setBins(bins.map(bin => 
      bin.id === id ? { ...bin, fillPercentage: 5, lidStatus: 'closed' } : bin
    ));
  };

  // Handle Master Dispatch with Live Truck Animation
  const handleMasterDispatch = () => {
    setIsDispatching(true);
    
    // Get all bins that need collection
    const binsToCollectArr = bins.filter(b => b.fillPercentage >= 70);
    if (binsToCollectArr.length === 0) {
      setIsDispatching(false);
      return;
    }

    // Step 1: Start truck at the first bin
    setTruckPosition([binsToCollectArr[0].lat, binsToCollectArr[0].lng]);
    
    let currentStop = 0;
    
    // Drive the truck to the next bin every 1 second
    const driveInterval = setInterval(() => {
      currentStop++;
      if (currentStop < binsToCollectArr.length) {
        setTruckPosition([binsToCollectArr[currentStop].lat, binsToCollectArr[currentStop].lng]);
      } else {
        // Reached the end of the route
        clearInterval(driveInterval);
        
        // Clear bins and hide truck
        setBins(prevBins => prevBins.map(bin => 
          bin.fillPercentage >= 70 ? { ...bin, fillPercentage: 5, lidStatus: 'closed', ultrasonicSensor: 'connected' } : bin
        ));
        setTruckPosition(null);
        setIsDispatching(false);
      }
    }, 1200); // 1.2 seconds driving time between bins
  };

  // Helper function for map marker color (Hex values for Leaflet)
  const getMarkerColor = (percentage) => {
    if (percentage >= 90) return '#ef4444';
    if (percentage >= 70) return '#f59e0b';
    return '#10b981';
  };

  // Create beautiful HTML-based map markers
  const createCustomIcon = (name, percentage) => {
    const color = getMarkerColor(percentage);
    const shortName = name.split(' - ')[1] || name;
    const isCritical = percentage >= 90;
    
    const trashSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`;

    const htmlString = `
      <div class="marker-badge" style="border: ${isCritical ? '2px solid #ef4444' : '1px solid rgba(0,0,0,0.05)'}">
        <div style="background-color: ${color}; box-shadow: 0 0 8px ${color}; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          ${trashSvg}
        </div>
        ${shortName}
        ${isCritical ? '<span style="color:#ef4444; margin-left:2px">🚨</span>' : ''}
      </div>
    `;

    return L.divIcon({
      className: 'custom-map-marker',
      html: htmlString,
      iconSize: [140, 40], 
      iconAnchor: [70, 20], 
    });
  };

  return (
    <div className="dashboard-container">
      {/* Header Area */}
      <header className="header">
        <div className="header-title">
          <h1>Smart Dustbin Dashboard</h1>
          <p>Real-time waste management & dynamic routing system</p>
        </div>
        <div className="glass-panel" style={{ padding: '0.75rem 1.5rem', borderRadius: '30px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
            <div style={{ width: '8px', height: '8px', background: 'var(--accent-green)', borderRadius: '50%', boxShadow: '0 0 10px var(--accent-green)' }}></div>
            System Online
          </span>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="nav-tabs" style={{ padding: '0 2rem', marginBottom: '1.5rem', borderBottom: 'none' }}>
        <button 
          className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
          style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', borderRadius: '8px' }}
        >
          <Activity size={18} /> System Overview
        </button>
        <button 
          className={`nav-tab ${activeTab === 'bins' ? 'active' : ''}`}
          onClick={() => setActiveTab('bins')}
          style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', borderRadius: '8px' }}
        >
          <Trash2 size={18} /> Bin Management
        </button>
        <button 
          className={`nav-tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
          style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', borderRadius: '8px' }}
        >
          <Activity size={18} /> Analytics & Reports
        </button>
        <button 
          className={`nav-tab ${activeTab === 'architecture' ? 'active' : ''}`}
          onClick={() => setActiveTab('architecture')}
          style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', borderRadius: '8px' }}
        >
          <Cpu size={18} /> System Architecture
        </button>
      </div>

      {/* Top Summary Cards */}
      <section className="summary-grid">
        <div className="glass-panel summary-card interactive" onClick={() => setActiveTab('bins')}>
          <div className="summary-icon status-blue">
            <Trash2 size={28} />
          </div>
          <div className="summary-info">
            <h3>{totalBins}</h3>
            <p>Total Bins</p>
          </div>
        </div>

        <div className="glass-panel summary-card interactive" onClick={() => setActiveTab('dashboard')}>
          <div className="summary-icon status-red">
            <AlertTriangle size={28} />
          </div>
          <div className="summary-info">
            <h3 style={{ color: 'var(--accent-red)' }}>{fullBins}</h3>
            <p style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--accent-red)' }}>CRITICAL (&gt;90%)</p>
            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Immediate pickup needed</span>
          </div>
        </div>

        <div className="glass-panel summary-card interactive" onClick={() => setActiveTab('analytics')}>
          <div className="summary-icon status-yellow">
            <Activity size={28} />
          </div>
          <div className="summary-info">
            <h3 style={{ color: 'var(--accent-yellow)' }}>{warningBins}</h3>
            <p style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--accent-yellow)' }}>WARNING (70-90%)</p>
            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Monitoring capacity</span>
          </div>
        </div>

        <div className="glass-panel summary-card interactive" onClick={() => setActiveTab('analytics')}>
          <div className="summary-icon status-green">
            <CheckCircle size={28} />
          </div>
          <div className="summary-info">
            <h3 style={{ color: 'var(--accent-green)' }}>{normalBins}</h3>
            <p style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--accent-green)' }}>OPTIMAL (&lt;70%)</p>
            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Operating normally</span>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="main-content">
        
        {/* SYSTEM OVERVIEW TAB */}
        {activeTab === 'dashboard' && (
          <div className="full-width">
            
            {/* Master Dispatch Panel */}
            <section className="glass-panel" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, rgba(255,255,255,0.9), rgba(240, 253, 244, 0.95))', borderLeft: '4px solid var(--accent-green)' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '0.25rem', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Truck size={20} color="var(--accent-green)" /> Intelligent Route Dispatcher
                </h2>
                <p style={{ color: '#6b7280', fontSize: '0.95rem', margin: 0 }}>
                  {binsToCollect.length > 0 
                    ? `System has identified ${binsToCollect.length} locations requiring immediate collection today.` 
                    : 'All locations are currently operating within normal capacity. No dispatch required.'}
                </p>
              </div>
              <button 
                className={`master-dispatch-btn ${isDispatching ? 'dispatching' : ''}`}
                onClick={handleMasterDispatch}
                disabled={binsToCollect.length === 0 || isDispatching}
                style={{ 
                  padding: '0.75rem 1.5rem', 
                  fontSize: '1.05rem', 
                  fontWeight: 600, 
                  borderRadius: '8px', 
                  border: 'none',
                  cursor: binsToCollect.length === 0 || isDispatching ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.3s ease',
                  backgroundColor: binsToCollect.length === 0 ? '#e5e7eb' : (isDispatching ? '#3b82f6' : 'var(--accent-green)'),
                  color: binsToCollect.length === 0 ? '#9ca3af' : 'white',
                  boxShadow: binsToCollect.length > 0 && !isDispatching ? '0 4px 14px rgba(16, 185, 129, 0.4)' : 'none'
                }}
              >
                {isDispatching ? (
                  <>
                    <div className="spinner"></div> Calculating Optimal Route...
                  </>
                ) : binsToCollect.length > 0 ? (
                  <>
                    🚀 Dispatch Truck to All {binsToCollect.length} Locations
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} /> Route Clear
                  </>
                )}
              </button>
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
              {/* Left Side: Live Map */}
              <div className="glass-panel" style={{ height: '500px', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <h2 className="section-header" style={{ padding: '1.25rem 1.5rem 0', margin: 0 }}>
                  <Map size={24} color="var(--accent-blue)" />
                  Dynamic Routing Map
                </h2>
                <div style={{ flex: 1, position: 'relative', marginTop: '1rem', zIndex: 0 }}>
                  <MapContainer center={[23.025, 72.555]} zoom={14} style={{ height: '100%', width: '100%', zIndex: 1 }}>
                    <TileLayer
                      url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                      attribution='&copy; Google Maps'
                    />
                    
                    {/* Draw simulated route for bins that need collection (> 70%) */}
                    <Polyline 
                      positions={bins.filter(b => b.fillPercentage >= 70).map(b => [b.lat, b.lng])} 
                      color="#3b82f6" 
                      weight={3} 
                      dashArray="5, 10" 
                      opacity={0.8} 
                    />

                    {/* The Animated Live Truck */}
                    {truckPosition && (
                      <Marker
                        position={truckPosition}
                        icon={L.divIcon({
                          className: 'animated-truck-marker',
                          html: `<div style="background: var(--accent-green); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.6); border: 2px solid white;"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h2"/><path d="M14 17h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg></div>`,
                          iconSize: [36, 36],
                          iconAnchor: [18, 18]
                        })}
                        zIndexOffset={1000}
                      />
                    )}

                    {bins.map(bin => (
                      <Marker
                        key={bin.id}
                        position={[bin.lat, bin.lng]}
                        icon={createCustomIcon(bin.name, bin.fillPercentage)}
                      >
                        <Popup>
                          <div style={{ padding: '0.25rem' }}>
                            <strong style={{ fontSize: '1.1em', color: '#1f2937' }}>{bin.name}</strong><br />
                            <span style={{ color: '#6b7280', fontSize: '0.9em' }}>Fill Level: <strong style={{ color: getMarkerColor(bin.fillPercentage) }}>{bin.fillPercentage}%</strong></span><br />
                            <span style={{ color: '#6b7280', fontSize: '0.9em' }}>Sensor Status: {bin.ultrasonicSensor}</span>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              </div>

            {/* Smart Alerts */}
            <div className="glass-panel">
              <h2 className="section-header">
                <Bell size={24} color="var(--accent-yellow)" />
                Smart Alerts
              </h2>
              <div className="alert-feed">
                {/* Generate Full/Critical Alerts */}
                {bins.filter(b => b.fillPercentage >= 90).map(bin => {
                  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                  <div key={`alert-full-${bin.id}`} className="alert-item critical">
                    <div className="alert-content">
                      <p className="alert-message">
                        <span style={{ fontWeight: 600, color: 'var(--accent-red)' }}>[{time}] 🚨 Alert:</span> <strong>{bin.name}</strong> is {bin.fillPercentage}% Full.
                      </p>
                    </div>
                  </div>
                )})}
                
                {/* Generate Sensor Warning Alerts */}
                {bins.filter(b => b.ultrasonicSensor === 'error' || b.lidStatus === 'error').map(bin => {
                  const time = new Date(Date.now() - 1000 * 60 * 15).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                  <div key={`alert-error-${bin.id}`} className="alert-item warning">
                    <div className="alert-content">
                      <p className="alert-message">
                        <span style={{ fontWeight: 600, color: 'var(--accent-yellow)' }}>[{time}] 🔧 Warning:</span> <strong>{bin.name}</strong> sensor error detected. Needs maintenance.
                      </p>
                    </div>
                  </div>
                )})}

                {/* Default state if no alerts */}
                {bins.every(b => b.fillPercentage < 90 && b.ultrasonicSensor !== 'error' && b.lidStatus !== 'error') && (
                  <div className="placeholder-area" style={{ height: '200px', border: 'none' }}>
                    <CheckCircle size={40} color="var(--accent-green)" />
                    <p style={{ marginTop: '1rem', fontWeight: 500 }}>No active alerts</p>
                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>System is running smoothly.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

        {/* ANALYTICS & REPORTS TAB */}
        {activeTab === 'analytics' && (
          <div className="full-width">
            {/* Eco-Stats Banner */}
            <section className="glass-panel" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.1), rgba(16, 185, 129, 0.15))', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center' }}>
              <div style={{ padding: '1rem' }}>
                <div style={{ color: 'var(--accent-green)', marginBottom: '0.5rem' }}><Leaf size={24} /></div>
                <h4 style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>Fuel Saved Today</h4>
                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-green)' }}>
                  {((bins.length - binsToCollect.length) * 1.5).toFixed(1)} Liters
                </p>
              </div>
              <div style={{ padding: '1rem', borderLeft: '1px solid rgba(16, 185, 129, 0.1)', borderRight: '1px solid rgba(16, 185, 129, 0.1)' }}>
                <div style={{ color: '#3b82f6', marginBottom: '0.5rem' }}><Truck size={24} /></div>
                <h4 style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>Bins Optimized</h4>
                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6' }}>
                  {bins.length - binsToCollect.length} Units
                </p>
              </div>
              <div style={{ padding: '1rem' }}>
                <div style={{ color: '#f59e0b', marginBottom: '0.5rem' }}><Activity size={24} /></div>
                <h4 style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>CO2 Reduced</h4>
                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>
                  {((bins.length - binsToCollect.length) * 2.3).toFixed(1)} kg
                </p>
              </div>
            </section>

            <div className="glass-panel" style={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
              <h2 className="section-header">
                <Activity size={24} color="var(--accent-blue)" />
                Historical Performance Analytics
              </h2>
              
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', marginTop: '1rem' }}>
                {/* Weekly Pattern Chart */}
                <div style={{ background: 'rgba(255,255,255,0.4)', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                  <h5 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem', color: '#6b7280', textAlign: 'center' }}>Weekly Average Fill Level (%)</h5>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 13 }} />
                      <YAxis axisLine={false} tickLine={false} domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
                      />
                      <Legend verticalAlign="top" height={36}/>
                      <Line 
                        name="City Average Fill"
                        type="monotone" 
                        dataKey="fill" 
                        stroke="var(--accent-blue)" 
                        strokeWidth={4} 
                        dot={{ r: 6, fill: 'var(--accent-blue)' }}
                        activeDot={{ r: 8, strokeWidth: 0 }}
                        animationDuration={2500}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Location Fill Rate Chart */}
                <div style={{ background: 'rgba(255,255,255,0.4)', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                  <h5 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem', color: '#6b7280', textAlign: 'center' }}>Fast-Filling Hotspots</h5>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={fillRateData} layout="vertical">
                      <XAxis type="number" hide domain={[0, 100]} />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 12 }} />
                      <Tooltip 
                        cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
                      />
                      <Bar dataKey="rate" radius={[0, 10, 10, 0]} animationDuration={2500} barSize={30}>
                        {fillRateData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.rate > 80 ? 'var(--accent-red)' : 'var(--accent-green)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SYSTEM ARCHITECTURE TAB */}
        {activeTab === 'architecture' && (
          <div className="full-width">
            {/* Hardware Components Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
              <div className="glass-panel hardware-card animate-fade-in" style={{ animationDelay: '0.1s', textAlign: 'center', padding: '2rem' }}>
                <div className="pulse-node" style={{ width: '60px', height: '60px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                  <Activity size={32} color="var(--accent-blue)" />
                </div>
                <h3 style={{ margin: '0 0 0.5rem 0' }}>HC-SR04 Sensor</h3>
                <p style={{ fontSize: '0.85rem', color: '#6b7280', lineHeight: 1.6 }}>
                  Uses ultrasonic waves to measure waste depth. Sends a 10µs pulse and measures the echo return time to calculate distance with high precision.
                </p>
              </div>

              <div className="glass-panel hardware-card animate-fade-in" style={{ animationDelay: '0.3s', textAlign: 'center', padding: '2rem' }}>
                <div className="pulse-node" style={{ width: '60px', height: '60px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                  <Cpu size={32} color="var(--accent-green)" />
                </div>
                <h3 style={{ margin: '0 0 0.5rem 0' }}>ESP8266 / NodeMCU</h3>
                <p style={{ fontSize: '0.85rem', color: '#6b7280', lineHeight: 1.6 }}>
                  The "Brain" of the system. Processes sensor data and uses its built-in Wi-Fi module to transmit fill-levels to the central dashboard via HTTP/MQTT.
                </p>
              </div>

              <div className="glass-panel hardware-card animate-fade-in" style={{ animationDelay: '0.5s', textAlign: 'center', padding: '2rem' }}>
                <div className="pulse-node" style={{ width: '60px', height: '60px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                  <Trash2 size={32} color="var(--accent-red)" />
                </div>
                <h3 style={{ margin: '0 0 0.5rem 0' }}>Servo Motor SG90</h3>
                <p style={{ fontSize: '0.85rem', color: '#6b7280', lineHeight: 1.6 }}>
                  Controls the automatic lid mechanism. Activates based on sensor distance or remote override commands from the control center.
                </p>
              </div>
            </div>

            {/* Professional Animated Data Journey */}
            <div className="glass-panel animate-fade-in" style={{ animationDelay: '0.7s', padding: '3rem 2rem' }}>
              <h2 className="section-header" style={{ justifyContent: 'center', marginBottom: '4rem' }}>
                <Activity size={24} color="var(--accent-blue)" />
                System Integration & Data Flow
              </h2>

              <div style={{ position: 'relative', maxWidth: '900px', margin: '0 auto', padding: '0 20px' }}>
                {/* The Continuous Track */}
                <div style={{ position: 'absolute', top: '40px', left: '40px', right: '40px', height: '6px', background: 'rgba(0,0,0,0.05)', borderRadius: '3px', zIndex: 1 }}>
                  {/* Moving Data Packets on a single track */}
                  <div className="data-packet" style={{ animationDuration: '6s', animationDelay: '0s' }}></div>
                  <div className="data-packet" style={{ animationDuration: '6s', animationDelay: '3s' }}></div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
                  {/* Node 1 */}
                  <div style={{ textAlign: 'center', width: '100px' }}>
                    <div style={{ width: '80px', height: '80px', background: 'white', borderRadius: '50%', border: '4px solid #3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)' }}>
                      <Activity size={32} color="#3b82f6" />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1f2937' }}>SENSING</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>Ultrasonic HC-SR04</div>
                  </div>

                  {/* Node 2 */}
                  <div style={{ textAlign: 'center', width: '100px' }}>
                    <div style={{ width: '80px', height: '80px', background: 'white', borderRadius: '50%', border: '4px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}>
                      <Cpu size={32} color="#10b981" />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1f2937' }}>PROCESSING</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>Logic & Math</div>
                  </div>

                  {/* Node 3 */}
                  <div style={{ textAlign: 'center', width: '100px' }}>
                    <div style={{ width: '80px', height: '80px', background: 'white', borderRadius: '50%', border: '4px solid #8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)' }}>
                      <Map size={32} color="#8b5cf6" />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1f2937' }}>CLOUD IOT</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>Data Sync</div>
                  </div>

                  {/* Node 4 */}
                  <div style={{ textAlign: 'center', width: '100px' }}>
                    <div style={{ width: '80px', height: '80px', background: 'white', borderRadius: '50%', border: '4px solid #f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)' }}>
                      <Activity size={32} color="#f59e0b" />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1f2937' }}>DASHBOARD</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>Live Visualization</div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '4rem', padding: '2rem', background: 'rgba(0,0,0,0.02)', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)', textAlign: 'center' }}>
                <h4 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', color: '#374151' }}>
                  <Activity size={20} /> Real-time Calculation Logic
                </h4>
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', maxWidth: '700px', margin: '0 auto' }}>
                  <code style={{ fontSize: '1.2rem', color: '#111827', fontWeight: 600 }}>
                    Fill Level % = [(Depth - Sensor_Output) / Depth] × 100
                  </code>
                </div>
                <p style={{ margin: '1.5rem 0 0 0', fontSize: '0.9rem', color: '#6b7280', maxWidth: '600px', margin: '1.5rem auto 0' }}>
                  The sensor calculates distance by multiplying the pulse travel time by the speed of sound (0.034 cm/μs) and dividing by 2.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* BIN MANAGEMENT TAB */}
        {activeTab === 'bins' && (
          <div className="glass-panel full-width">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <button 
                onClick={() => setActiveTab('dashboard')} 
                style={{ padding: '0.5rem 1rem', border: '1px solid var(--accent-blue)', background: 'transparent', color: 'var(--accent-blue)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
              >
                ← Back to Dashboard
              </button>
              <h2 className="section-header" style={{ margin: 0 }}>
                <Trash2 size={24} color="var(--accent-blue)" />
                Bin Management & Sensor Data
              </h2>
            </div>
            <div className="bins-grid">
              {bins.map((bin) => (
                <div key={bin.id} className="glass-panel bin-card" style={{ padding: '1.25rem' }}>
                  
                  {/* Header */}
                  <div className="bin-header">
                    <div className="bin-title">{bin.name}</div>
                    <div className="toggle-switch">
                      <div className={`toggle-bg ${bin.isActive ? 'active' : ''}`}>
                        <div className="toggle-knob"></div>
                      </div>
                      {bin.isActive ? 'Active' : 'Offline'}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="progress-container">
                    <div className="progress-label">Bin Filled:</div>
                    <div className="progress-bar-bg">
                      <div 
                        className={`progress-bar-fill ${getProgressBarColor(bin.fillPercentage)}`}
                        style={{ width: `${bin.fillPercentage}%` }}
                      >
                        {bin.fillPercentage}%
                      </div>
                    </div>
                  </div>

                  {/* 2x2 Sensor Details Grid */}
                  <div className="sensor-details-grid">
                    <div className="sensor-item">
                      <span className="sensor-label">Lid Sensor (PIR):</span>
                      <span className={`sensor-value ${bin.lidStatus === 'error' ? 'error' : 'connected'}`}>
                        {bin.lidStatus === 'error' ? 'Error' : 'Connected'}
                      </span>
                    </div>
                    <div className="sensor-item">
                      <span className="sensor-label">Ultrasonic Sensor:</span>
                      <span className={`sensor-value ${bin.ultrasonicSensor === 'error' ? 'error' : 'connected'}`}>
                        {bin.ultrasonicSensor === 'error' ? 'Error' : 'Connected'}
                      </span>
                    </div>
                    <div className="sensor-item">
                      <span className="sensor-label">Lid Status:</span>
                      <span className="sensor-value" style={{ textTransform: 'capitalize' }}>
                        {bin.lidStatus}
                      </span>
                    </div>
                    <div className="sensor-item">
                      <span className="sensor-label">Bin Depth (D):</span>
                      <span className="sensor-value">
                        {bin.depth} cm
                        <Edit2 size={14} className="edit-icon" />
                      </span>
                    </div>
                  </div>

                  {/* Action Area */}
                  <button 
                    className={`action-button ${bin.fillPercentage >= 90 ? 'btn-dispatch' : 'btn-outline'}`}
                    onClick={() => handleEmptyBin(bin.id)}
                  >
                    {bin.fillPercentage >= 90 ? <Truck size={18} /> : <Trash2 size={18} />}
                    {bin.fillPercentage >= 90 ? 'Dispatch Truck & Empty' : 'Empty Bin'}
                  </button>

                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default App;
