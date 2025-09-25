const db = require('./src/config/db');

async function seedRouteStops() {
  try {
    console.log('🌱 Starting to seed route stops...');
    
    // Clear existing data from route_stops
    console.log('Clearing existing route_stops...');
    await db.query('DELETE FROM route_stops WHERE route_id IN (1, 2, 3, 4)');
    
    // Insert sample data for all routes
    const routeStopsData = [
      // Route 1: Chandigarh to Ludhiana
      [1, 'ISBT Chandigarh', 1, 30.73330000, 76.77940000, '09:00:00'],
      [1, 'Sector 17 Bus Stand', 2, 30.74120000, 76.78340000, '09:15:00'],
      [1, 'Zirakpur', 3, 30.64890000, 76.81820000, '09:30:00'],
      [1, 'Rajpura', 4, 30.48470000, 76.59410000, '09:45:00'],
      [1, 'Sirhind', 5, 30.64350000, 76.38180000, '10:00:00'],
      [1, 'Khanna', 6, 30.70540000, 76.22190000, '10:15:00'],
      [1, 'Ludhiana Bus Stand', 7, 30.90100000, 75.85730000, '10:30:00'],
      
      // Route 2: Chandigarh to Jalandhar  
      [2, 'ISBT Chandigarh', 1, 30.73330000, 76.77940000, '08:00:00'],
      [2, 'Sector 17 Bus Stand', 2, 30.74120000, 76.78340000, '08:15:00'],
      [2, 'Zirakpur', 3, 30.64890000, 76.81820000, '08:30:00'],
      [2, 'Rajpura', 4, 30.48470000, 76.59410000, '08:45:00'],
      [2, 'Ludhiana', 5, 30.90100000, 75.85730000, '09:30:00'],
      [2, 'Phagwara', 6, 31.22400000, 75.77390000, '10:00:00'],
      [2, 'Jalandhar Bus Stand', 7, 31.32600000, 75.57620000, '10:30:00'],
      
      // Route 3: Ludhiana to Amritsar
      [3, 'Ludhiana Bus Stand', 1, 30.90100000, 75.85730000, '11:00:00'],
      [3, 'Phillaur', 2, 31.01740000, 75.79240000, '11:20:00'],
      [3, 'Phagwara', 3, 31.22400000, 75.77390000, '11:40:00'],
      [3, 'Jalandhar City', 4, 31.32600000, 75.57620000, '12:00:00'],
      [3, 'Kapurthala', 5, 31.38000000, 75.38180000, '12:30:00'],
      [3, 'Sultanpur Lodhi', 6, 31.22330000, 75.21220000, '12:50:00'],
      [3, 'Amritsar Bus Stand', 7, 31.63400000, 74.87230000, '13:30:00'],
      
      // Route 4: Patiala to Chandigarh
      [4, 'Patiala Bus Stand', 1, 30.33980000, 76.38690000, '14:00:00'],
      [4, 'Samana', 2, 30.14740000, 76.48570000, '14:20:00'],
      [4, 'Rajpura', 3, 30.48470000, 76.59410000, '14:40:00'],
      [4, 'Zirakpur', 4, 30.64890000, 76.81820000, '15:00:00'],
      [4, 'Sector 17 Bus Stand', 5, 30.74120000, 76.78340000, '15:15:00'],
      [4, 'ISBT Chandigarh', 6, 30.73330000, 76.77940000, '15:30:00']
    ];
    
    console.log(`Inserting ${routeStopsData.length} route stops...`);
    
    // Insert all route stops
    for (const stopData of routeStopsData) {
      await db.query(
        'INSERT INTO route_stops (route_id, stop_name, stop_order, latitude, longitude, estimated_arrival_time) VALUES (?, ?, ?, ?, ?, ?)',
        stopData
      );
    }
    
    console.log(`✅ Successfully seeded ${routeStopsData.length} route stops`);
    
    // Check what we have in the database now
    console.log('\n📊 Checking seeded data:');
    const [routes] = await db.query('SELECT * FROM routes');
    console.log('Available routes:', routes);
    
    const [buses] = await db.query('SELECT * FROM buses');
    console.log('Available buses:', buses);
    
    const [stops] = await db.query('SELECT route_id, stop_name, stop_order FROM route_stops ORDER BY route_id, stop_order');
    console.log('Route stops created:', stops);
    
    console.log('\n🎉 Seeding completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error seeding route stops:', error);
    process.exit(1);
  }
}

// Run the seeding
seedRouteStops();