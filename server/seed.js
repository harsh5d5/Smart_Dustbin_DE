import pool from './db.js';

async function seed() {
  console.log('🌱 Seeding database...');

  // Create bins table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bins (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      is_active BOOLEAN DEFAULT true,
      fill_percentage INTEGER DEFAULT 0,
      ultrasonic_sensor VARCHAR(20) DEFAULT 'connected',
      lid_status VARCHAR(20) DEFAULT 'closed',
      depth INTEGER DEFAULT 30,
      lat DECIMAL(10, 6),
      lng DECIMAL(10, 6)
    );
  `);
  console.log('✅ Table "bins" created');

  // Check if data already exists
  const { rows } = await pool.query('SELECT COUNT(*) FROM bins');
  if (parseInt(rows[0].count) > 0) {
    console.log('ℹ️  Data already exists, skipping seed insert.');
    await pool.end();
    return;
  }

  // Insert seed data (same as the mock data from App.jsx)
  const binsData = [
    { name: 'Bin 01 - LD College',      is_active: true,  fill_percentage: 29, ultrasonic_sensor: 'connected', lid_status: 'closed', depth: 30, lat: 23.0350, lng: 72.5464 },
    { name: 'Bin 02 - Law Garden',       is_active: true,  fill_percentage: 85, ultrasonic_sensor: 'connected', lid_status: 'open',   depth: 45, lat: 23.0249, lng: 72.5604 },
    { name: 'Bin 03 - Riverfront',       is_active: true,  fill_percentage: 95, ultrasonic_sensor: 'connected', lid_status: 'closed', depth: 30, lat: 23.0210, lng: 72.5714 },
    { name: 'Bin 04 - Paldi',            is_active: false, fill_percentage: 10, ultrasonic_sensor: 'error',     lid_status: 'closed', depth: 30, lat: 23.0115, lng: 72.5550 },
    { name: 'Bin 05 - Gujarat College',  is_active: true,  fill_percentage: 75, ultrasonic_sensor: 'connected', lid_status: 'closed', depth: 40, lat: 23.0215, lng: 72.5570 },
    { name: 'Bin 06 - CG Road',          is_active: true,  fill_percentage: 92, ultrasonic_sensor: 'connected', lid_status: 'open',   depth: 35, lat: 23.0320, lng: 72.5560 },
    { name: 'Bin 07 - Ashram Road',      is_active: true,  fill_percentage: 40, ultrasonic_sensor: 'connected', lid_status: 'closed', depth: 30, lat: 23.0300, lng: 72.5700 },
    { name: 'Bin 08 - Navrangpura',      is_active: true,  fill_percentage: 15, ultrasonic_sensor: 'connected', lid_status: 'closed', depth: 40, lat: 23.0380, lng: 72.5510 },
  ];

  for (const bin of binsData) {
    await pool.query(
      `INSERT INTO bins (name, is_active, fill_percentage, ultrasonic_sensor, lid_status, depth, lat, lng)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [bin.name, bin.is_active, bin.fill_percentage, bin.ultrasonic_sensor, bin.lid_status, bin.depth, bin.lat, bin.lng]
    );
  }

  console.log('✅ Inserted 8 bins');
  await pool.end();
  console.log('🎉 Seed complete!');
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
