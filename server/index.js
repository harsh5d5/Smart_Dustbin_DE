import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ──────────────────────────────────────────
// GET /api/bins — Fetch all bins
// ──────────────────────────────────────────
app.get('/api/bins', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM bins ORDER BY id');
    // Convert snake_case DB columns to camelCase for the frontend
    const bins = rows.map(row => ({
      id: row.id,
      name: row.name,
      isActive: row.is_active,
      fillPercentage: row.fill_percentage,
      ultrasonicSensor: row.ultrasonic_sensor,
      lidStatus: row.lid_status,
      depth: row.depth,
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lng),
    }));
    res.json(bins);
  } catch (err) {
    console.error('Error fetching bins:', err);
    res.status(500).json({ error: 'Failed to fetch bins' });
  }
});

// ──────────────────────────────────────────
// PUT /api/bins/:id — Update a single bin
// ──────────────────────────────────────────
app.put('/api/bins/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fillPercentage, lidStatus, ultrasonicSensor, isActive } = req.body;

    const { rows } = await pool.query(
      `UPDATE bins 
       SET fill_percentage = COALESCE($1, fill_percentage),
           lid_status = COALESCE($2, lid_status),
           ultrasonic_sensor = COALESCE($3, ultrasonic_sensor),
           is_active = COALESCE($4, is_active)
       WHERE id = $5
       RETURNING *`,
      [fillPercentage, lidStatus, ultrasonicSensor, isActive, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Bin not found' });
    }

    res.json({ message: 'Bin updated', bin: rows[0] });
  } catch (err) {
    console.error('Error updating bin:', err);
    res.status(500).json({ error: 'Failed to update bin' });
  }
});

// ──────────────────────────────────────────
// POST /api/bins/:id/empty — Empty a single bin
// ──────────────────────────────────────────
app.post('/api/bins/:id/empty', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `UPDATE bins SET fill_percentage = 5, lid_status = 'closed' WHERE id = $1 RETURNING *`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Bin not found' });
    }

    res.json({ message: 'Bin emptied', bin: rows[0] });
  } catch (err) {
    console.error('Error emptying bin:', err);
    res.status(500).json({ error: 'Failed to empty bin' });
  }
});

// In-memory cache for 3D depth meshes of each bin
const meshCache = {};

// ──────────────────────────────────────────
// POST /api/bins/dispatch — Empty all bins >= 70%
// ──────────────────────────────────────────
app.post('/api/bins/dispatch', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE bins 
       SET fill_percentage = 5, lid_status = 'closed', ultrasonic_sensor = 'connected' 
       WHERE fill_percentage >= 70 
       RETURNING *`
    );

    // Clear mesh cache for emptied bins
    rows.forEach(row => {
      delete meshCache[row.id];
    });

    res.json({ message: `Dispatched and emptied ${rows.length} bins`, count: rows.length });
  } catch (err) {
    console.error('Error dispatching:', err);
    res.status(500).json({ error: 'Failed to dispatch' });
  }
});

// ──────────────────────────────────────────
// GET /api/bins/:id/mesh — Fetch 3D depth mesh coordinates
// ──────────────────────────────────────────
app.get('/api/bins/:id/mesh', (req, res) => {
  const { id } = req.params;
  if (meshCache[id]) {
    res.json(meshCache[id]);
  } else {
    res.json(null);
  }
});

// ──────────────────────────────────────────
// POST /api/bins/:id/mesh — Update 3D depth mesh coordinates
// ──────────────────────────────────────────
app.post('/api/bins/:id/mesh', async (req, res) => {
  try {
    const { id } = req.params;
    const { x, y, z, fillPercentage, averageHeight, maxHeight } = req.body;

    // Cache the coordinates and physical depth metrics
    meshCache[id] = { 
      x, 
      y, 
      z, 
      averageHeight: averageHeight || 0, 
      maxHeight: maxHeight || 0 
    };

    // Update fill percentage in database if provided
    if (fillPercentage !== undefined) {
      await pool.query(
        'UPDATE bins SET fill_percentage = $1 WHERE id = $2',
        [Math.round(fillPercentage), id]
      );
    }

    res.json({ message: 'Mesh coordinates updated successfully', fillPercentage });
  } catch (err) {
    console.error('Error updating mesh:', err);
    res.status(500).json({ error: 'Failed to update mesh coordinates' });
  }
});

// Alerts in-memory cache
let alerts = [];

// ──────────────────────────────────────────
// GET /api/alerts — Fetch all active safety alerts
// ──────────────────────────────────────────
app.get('/api/alerts', (req, res) => {
  res.json(alerts);
});

// ──────────────────────────────────────────
// POST /api/alerts — Insert a new safety alert (e.g. fire, smoke)
// ──────────────────────────────────────────
app.post('/api/alerts', (req, res) => {
  const { type, message, binId } = req.body;
  const newAlert = {
    id: Date.now(),
    type, // 'fire' | 'smoke'
    message,
    binId: binId || 1,
    timestamp: new Date().toLocaleTimeString()
  };
  alerts.unshift(newAlert);
  if (alerts.length > 20) {
    alerts = alerts.slice(0, 20);
  }
  res.json({ message: 'Alert registered successfully', alert: newAlert });
});

// ──────────────────────────────────────────
// DELETE /api/alerts — Clear all safety alerts
// ──────────────────────────────────────────
app.delete('/api/alerts', (req, res) => {
  alerts = [];
  res.json({ message: 'Alerts logs cleared' });
});

// ──────────────────────────────────────────
// Start server
// ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
