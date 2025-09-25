const db = require('../config/db');

// Get all buses with current driver sessions and routes - UPDATED FOR NEW SCHEMA
exports.getAllBuses = async (req, res) => {
  try {
    const query = `
      SELECT 
        b.bus_id, 
        b.bus_number, 
        b.capacity, 
        b.status,
        ds.route_id,
        r.source_name,
        r.destination_name,
        r.total_distance_km,
        d.name as driver_name,
        d.mobile as driver_mobile,
        l.latitude as current_lat,
        l.longitude as current_lon,
        l.timestamp as last_updated
      FROM buses b
      LEFT JOIN driver_sessions ds ON b.bus_id = ds.bus_id AND ds.end_time IS NULL
      LEFT JOIN routes r ON ds.route_id = r.route_id
      LEFT JOIN drivers d ON ds.driver_id = d.driver_id
      LEFT JOIN location_updates l ON b.bus_id = l.bus_id
      WHERE l.timestamp = (
        SELECT MAX(timestamp) FROM location_updates l2 WHERE l2.bus_id = b.bus_id
      ) OR l.timestamp IS NULL
      ORDER BY b.bus_id
    `;
    
    const [buses] = await db.query(query);
    res.json({ 
      success: true,
      buses: buses.map(bus => ({
        bus_id: bus.bus_id,
        bus_number: bus.bus_number,
        capacity: bus.capacity,
        status: bus.status,
        route: bus.route_id ? {
          route_id: bus.route_id,
          route_name: `${bus.source_name} to ${bus.destination_name}`,
          source: bus.source_name,
          destination: bus.destination_name,
          distance_km: bus.total_distance_km
        } : null,
        driver: bus.driver_name ? {
          name: bus.driver_name,
          mobile: bus.driver_mobile
        } : null,
        current_location: bus.current_lat && bus.current_lon ? {
          latitude: bus.current_lat,
          longitude: bus.current_lon,
          last_updated: bus.last_updated
        } : null
      }))
    });
    
  } catch (error) {
    console.error('Error fetching buses:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Search buses by source and destination - FIXED FOR REAL SCHEMA
exports.searchBuses = async (req, res) => {
  const { source, destination } = req.query;

  console.log('🔍 [SEARCH BUSES] Received request:', { source, destination });

  if (!source || !destination) {
    return res.status(400).json({ message: 'Source and destination are required.' });
  }

  try {
    const sourceSearch = `%${source.toLowerCase()}%`;
    const destinationSearch = `%${destination.toLowerCase()}%`;

    // Find routes that match source and destination
    const routeQuery = `
      SELECT 
        route_id,
        source_name,
        destination_name,
        total_distance_km
      FROM routes 
      WHERE LOWER(source_name) LIKE ? 
      AND LOWER(destination_name) LIKE ?
    `;
    
    const [matchingRoutes] = await db.query(routeQuery, [sourceSearch, destinationSearch]);
    console.log('🗺️ Found matching routes:', matchingRoutes.length);
    
    if (matchingRoutes.length === 0) {
      // No exact routes found, return empty result
      return res.json({ 
        success: true,
        buses: [],
        message: `No direct routes found from ${source} to ${destination}`
      });
    }

    // Get all buses with their current assignments
    const busQuery = `
      SELECT 
        b.bus_id, 
        b.bus_number, 
        b.capacity, 
        b.status,
        b.current_driver_id,
        d.name as driver_name,
        d.mobile as driver_mobile,
        r.route_id,
        r.source_name,
        r.destination_name,
        r.total_distance_km
      FROM buses b
      LEFT JOIN drivers d ON b.current_driver_id = d.driver_id
      LEFT JOIN driver_sessions ds ON b.bus_id = ds.bus_id AND ds.end_time IS NULL
      LEFT JOIN routes r ON ds.route_id = r.route_id
      WHERE b.status IN ('available', 'running')
      ORDER BY b.bus_id
    `;
    
    const [allBuses] = await db.query(busQuery);
    console.log('🚌 Found total buses:', allBuses.length);
    
    // Transform buses data for frontend
    const transformedBuses = allBuses.map((bus, index) => {
      // If bus has an active route, use it; otherwise assign a matching route
      const assignedRoute = bus.route_id ? 
        { route_id: bus.route_id, source_name: bus.source_name, destination_name: bus.destination_name, total_distance_km: bus.total_distance_km } :
        matchingRoutes[index % matchingRoutes.length]; // Distribute buses across available routes
      
      return {
        id: bus.bus_id,
        bus_id: bus.bus_id,
        bus_number: bus.bus_number,
        busId: bus.bus_number,
        status: bus.status === 'available' ? 'available' : 'active',
        type: bus.status,
        capacity: bus.capacity,
        route_id: assignedRoute.route_id,
        route_name: `${assignedRoute.source_name} to ${assignedRoute.destination_name}`,
        route: `${assignedRoute.source_name} to ${assignedRoute.destination_name}`,
        source_stop: assignedRoute.source_name,
        destination_stop: assignedRoute.destination_name,
        from: assignedRoute.source_name,
        to: assignedRoute.destination_name,
        distance_km: assignedRoute.total_distance_km || 0,
        driver_id: bus.current_driver_id,
        driver_name: bus.driver_name || 'Not Assigned',
        driver_mobile: bus.driver_mobile,
        eta: bus.status === 'running' ? 'On Route' : 'Ready',
        coordinate: {
          latitude: 30.7333 + (Math.random() - 0.5) * 0.1,
          longitude: 76.7794 + (Math.random() - 0.5) * 0.1
        },
        current_location: '30.7333,76.7794',
        imageUrl: (index % 3) + 1, // Cycle through 1, 2, 3 for bus images
        changeInfo: `Available from ${assignedRoute.source_name}`
      };
    });
    
    console.log('✅ Returning', transformedBuses.length, 'buses');
    res.json({ 
      success: true,
      buses: transformedBuses
    });
    
  } catch (error) {
    console.error('❌ Error searching buses:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Get all unique route locations (sources and destinations) - NEW ENDPOINT
exports.getRouteLocations = async (req, res) => {
  try {
    // Get unique locations from routes table (both sources and destinations)
    const [locations] = await db.query(`
      SELECT DISTINCT location_name, 
             AVG(location_lat) as latitude, 
             AVG(location_lon) as longitude, 
             COUNT(*) as routes_count
      FROM (
        SELECT source_name as location_name, source_lat as location_lat, source_lon as location_lon
        FROM routes
        WHERE source_name IS NOT NULL
        UNION ALL
        SELECT destination_name as location_name, destination_lat as location_lat, destination_lon as location_lon
        FROM routes
        WHERE destination_name IS NOT NULL
      ) AS all_locations
      WHERE location_name IS NOT NULL
      GROUP BY location_name
      ORDER BY location_name
    `);
    
    // Transform the data to match frontend expectations
    const transformedLocations = locations.map(location => ({
      stop_id: `location_${location.location_name.replace(/\s+/g, '_')}`, // Create unique ID
      stop_name: location.location_name,
      location: location.location_name, // Same as stop_name for route locations
      region: location.location_name, // Use location name as region
      latitude: location.latitude,
      longitude: location.longitude,
      routes_count: location.routes_count
    }));
    
    res.json({ 
      success: true,
      stops: transformedLocations // Keep same field name for frontend compatibility
    });
  } catch (error) {
    console.error('Error fetching route locations:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get all bus stops from the stops table - UPDATED FOR NEW SCHEMA
exports.getAllBusStops = async (req, res) => {
  try {
    const [stops] = await db.query(`
      SELECT DISTINCT 
        s.stop_id,
        s.stop_name, 
        s.stop_lat as latitude,
        s.stop_lon as longitude,
        COUNT(DISTINCT s.route_id) as routes_count,
        GROUP_CONCAT(DISTINCT r.source_name ORDER BY r.source_name SEPARATOR ', ') as regions
      FROM stops s
      LEFT JOIN routes r ON s.route_id = r.route_id
      GROUP BY s.stop_id, s.stop_name, s.stop_lat, s.stop_lon
      ORDER BY s.stop_name
    `);
    
    // Transform the data to match frontend expectations
    const transformedStops = stops.map(stop => {
      // Extract location from stop name (e.g., "Stop 1 - Medical College" -> "Medical College")
      const nameParts = stop.stop_name.split(' - ');
      const location = nameParts.length > 1 ? nameParts[1] : stop.stop_name;
      const region = stop.regions || 'Unknown';
      
      return {
        stop_id: stop.stop_id,
        stop_name: stop.stop_name,
        location: location,
        region: region,
        latitude: stop.latitude,
        longitude: stop.longitude,
        routes_count: stop.routes_count
      };
    });
    
    res.json({ 
      success: true,
      stops: transformedStops
    });
  } catch (error) {
    console.error('Error fetching bus stops:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get real-time bus locations - UPDATED FOR NEW SCHEMA
exports.getBusLocations = async (req, res) => {
  try {
    const query = `
      SELECT 
        b.bus_id,
        b.bus_number,
        b.status,
        l.latitude,
        l.longitude,
        l.timestamp,
        r.source_name,
        r.destination_name
      FROM buses b
      LEFT JOIN location_updates l ON b.bus_id = l.bus_id
      LEFT JOIN driver_sessions ds ON b.bus_id = ds.bus_id AND ds.end_time IS NULL
      LEFT JOIN routes r ON ds.route_id = r.route_id
      WHERE l.timestamp = (
        SELECT MAX(timestamp) FROM location_updates l2 WHERE l2.bus_id = b.bus_id
      )
      AND b.status IN ('running', 'available')
      ORDER BY l.timestamp DESC
    `;
    
    const [locations] = await db.query(query);
    res.json({ 
      success: true,
      locations: locations
    });
    
  } catch (error) {
    console.error('Error fetching bus locations:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get detailed bus information - UPDATED FOR NEW SCHEMA
exports.getBusDetails = async (req, res) => {
  const { busId } = req.params;
  
  if (!busId) {
    return res.status(400).json({ message: 'Bus ID is required.' });
  }

  try {
    const query = `
      SELECT 
        b.bus_id, 
        b.bus_number, 
        b.capacity, 
        b.status,
        ds.route_id,
        r.source_name,
        r.destination_name,
        r.total_distance_km,
        d.driver_id,
        d.name as driver_name,
        d.mobile as driver_mobile,
        d.license_no,
        l.latitude,
        l.longitude,
        l.timestamp as last_location_update
      FROM buses b
      LEFT JOIN driver_sessions ds ON b.bus_id = ds.bus_id AND ds.end_time IS NULL
      LEFT JOIN routes r ON ds.route_id = r.route_id
      LEFT JOIN drivers d ON ds.driver_id = d.driver_id
      LEFT JOIN location_updates l ON b.bus_id = l.bus_id
      WHERE b.bus_id = ?
      AND (l.timestamp = (SELECT MAX(timestamp) FROM location_updates l2 WHERE l2.bus_id = b.bus_id) OR l.timestamp IS NULL)
      LIMIT 1
    `;
    
    const [buses] = await db.query(query, [busId]);
    
    if (buses.length === 0) {
      return res.status(404).json({ message: 'Bus not found.' });
    }
    
    const bus = buses[0];
    res.json({ 
      success: true,
      bus: {
        bus_id: bus.bus_id,
        bus_number: bus.bus_number,
        capacity: bus.capacity,
        status: bus.status,
        route: bus.route_id ? {
          route_id: bus.route_id,
          route_name: `${bus.source_name} to ${bus.destination_name}`,
          source: bus.source_name,
          destination: bus.destination_name,
          distance_km: bus.total_distance_km
        } : null,
        driver: bus.driver_id ? {
          driver_id: bus.driver_id,
          name: bus.driver_name,
          mobile: bus.driver_mobile,
          license_no: bus.license_no
        } : null,
        current_location: bus.latitude && bus.longitude ? {
          latitude: bus.latitude,
          longitude: bus.longitude,
          last_updated: bus.last_location_update
        } : null
      }
    });
    
  } catch (error) {
    console.error('Error fetching bus details:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get route stops for a specific bus - NEW ENDPOINT FOR TIMELINE
// exports.getBusRouteStops = async (req, res) => {
//   const { busId } = req.params;
  
//   console.log('🔍 [BUS ROUTE STOPS] Request for bus:', busId);
  
//   if (!busId) {
//     return res.status(400).json({ message: 'Bus ID is required.' });
//   }

//   try {
//     // First, find the route this bus is assigned to
//     const busRouteQuery = `
//       SELECT 
//         b.bus_id,
//         b.bus_number,
//         b.status,
//         r.route_id,
//         r.source_name,
//         r.destination_name,
//         r.total_distance_km
//       FROM buses b
//       LEFT JOIN driver_sessions ds ON b.bus_id = ds.bus_id AND ds.end_time IS NULL
//       LEFT JOIN routes r ON ds.route_id = r.route_id
//       WHERE b.bus_id = ?
//       LIMIT 1
//     `;
    
//     const [busInfo] = await db.query(busRouteQuery, [busId]);
    
//     if (busInfo.length === 0) {
//       return res.status(404).json({ message: 'Bus not found.' });
//     }

//     const bus = busInfo[0];
    
//     // If bus has no active route, assign a route based on bus ID for variety
//     let routeId = bus.route_id;
//     const requestedRouteId = req.query.route_id || req.body.route_id;
//     if (!routeId && requestedRouteId) {
//       // Assign different routes to different buses for variety
//       const routeAssignmentQuery = `
//         SELECT route_id FROM routes 
//         ORDER BY route_id 
//         LIMIT 1 OFFSET ?
//       `;
//       const routeOffset = (parseInt(busId) - 1) % 3; // Cycle through first 3 routes
//       const [assignedRoutes] = await db.query(routeAssignmentQuery, [routeOffset]);
      
//       if (assignedRoutes.length === 0) {
//         // Fallback to first available route
//         const [fallbackRoutes] = await db.query('SELECT route_id FROM routes LIMIT 1');
//         routeId = fallbackRoutes.length > 0 ? fallbackRoutes[0].route_id : null;
//       } else {
//         routeId = assignedRoutes[0].route_id;
//       }
      
//       console.log(`🚌 Bus ${busId} assigned to route ${routeId} (dynamic assignment)`);
//     } else {
//       console.log(`🚌 Bus ${busId} has active route ${routeId}`);
//     }
    
//     if (!routeId) {
//       return res.status(404).json({ message: 'No route found for this bus.' });
//     }
    
//     // Get all stops for this route
//     const stopsQuery = `
//       SELECT 
//         s.stop_id,
//         s.stop_name,
//         s.stop_lat,
//         s.stop_lon,
//         s.sequence_no,
//         r.source_name,
//         r.destination_name
//       FROM stops s
//       JOIN routes r ON s.route_id = r.route_id
//       WHERE s.route_id = ?
//       ORDER BY s.sequence_no
//     `;
    
//     const [stops] = await db.query(stopsQuery, [routeId]);
    
//     console.log('🗺️ Found', stops.length, 'stops for route', routeId);
    
//     // Transform stops for frontend timeline
//     const transformedStops = stops.map((stop, index) => {
//       const isFirst = index === 0;
//       const isLast = index === stops.length - 1;
//       const isCurrent = index === Math.floor(stops.length / 3); // Mock current position
      
//       let status = 'upcoming';
//       if (index < isCurrent) status = 'completed';
//       if (index === isCurrent) status = 'current';
      
//       // Generate realistic times
//       const baseTime = new Date();
//       baseTime.setHours(9, 0, 0); // Start at 9 AM
//       baseTime.setMinutes(baseTime.getMinutes() + (index * 15)); // 15 min intervals
      
//       return {
//         id: stop.stop_id,
//         name: stop.stop_name,
//         arrivalTime: baseTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
//         status: status,
//         distance: Math.round(index * 10), // Mock distance calculation
//         eta: status === 'completed' ? 'Passed' : status === 'current' ? 'Now' : `${15 - (index - isCurrent) * 5} min`,
//         latitude: stop.stop_lat || 0,
//         longitude: stop.stop_lon || 0,
//         stop_order: stop.sequence_no
//       };
//     });

//     const response = {
//       success: true,
//       data: {
//         bus: {
//           bus_id: bus.bus_id,
//           bus_number: bus.bus_number,
//           status: bus.status || 'available'
//         },
//         route: {
//           route_id: routeId,
//           route_name: `${stops[0]?.source_name || 'Unknown'} to ${stops[0]?.destination_name || 'Unknown'}`,
//           source_stop: stops[0]?.source_name || 'Unknown',
//           destination_stop: stops[0]?.destination_name || 'Unknown',
//           total_stops: transformedStops.length
//         },
//         timeline: {
//           stops: transformedStops,
//           current_stop_index: Math.floor(transformedStops.length / 3),
//           last_updated: new Date().toISOString()
//         }
//       }
//     };

//     console.log('✅ Returning timeline with', transformedStops.length, 'stops');
//     res.json(response);
    
//   } catch (error) {
//     console.error('❌ Error fetching bus route stops:', error);
//     res.status(500).json({ 
//       success: false,
//       message: 'Server error while fetching route stops',
//       error: error.message 
//     });
//   }
// };

// Get route stops for a specific bus - CORRECTED LOGIC
exports.getBusRouteStops = async (req, res) => {
  const { busId } = req.params;
  // Get the route_id passed from the frontend search context
  const { route_id: requestedRouteId } = req.query;

  console.log('🔍 [BUS ROUTE STOPS] Request for bus:', busId);
  if (requestedRouteId) {
    console.log('   -> With requested route_id:', requestedRouteId);
  }

  if (!busId) {
    return res.status(400).json({ message: 'Bus ID is required.' });
  }

  try {
    // First, find the bus and its CURRENTLY ACTIVE route, if any
    const busRouteQuery = `
      SELECT 
        b.bus_id,
        b.bus_number,
        b.status,
        r.route_id
      FROM buses b
      LEFT JOIN driver_sessions ds ON b.bus_id = ds.bus_id AND ds.end_time IS NULL
      LEFT JOIN routes r ON ds.route_id = r.route_id
      WHERE b.bus_id = ?
      LIMIT 1
    `;
    
    const [busInfo] = await db.query(busRouteQuery, [busId]);
    
    if (busInfo.length === 0) {
      return res.status(404).json({ message: 'Bus not found.' });
    }

    const bus = busInfo[0];
    let routeId;

    // --- LOGIC TO DETERMINE THE CORRECT ROUTE ID ---
    if (bus.route_id) {
      // 1. PRIORITY: The bus is on an active trip. Use its live route_id.
      routeId = bus.route_id;
      console.log(`🚌 Bus ${busId} has a LIVE active route: ${routeId}`);
    } else if (requestedRouteId) {
      // 2. SECONDARY: The bus is available, so use the route_id from the user's search.
      routeId = requestedRouteId;
      console.log(`🚌 Bus ${busId} is available. Using REQUESTED route from search: ${routeId}`);
    } else {
      // 3. FALLBACK: The bus is available but no route was requested. Assign a default for display.
      const [fallbackRoutes] = await db.query('SELECT route_id FROM routes ORDER BY route_id LIMIT 1');
      if (fallbackRoutes.length > 0) {
        routeId = fallbackRoutes[0].route_id;
        console.log(`⚠️ No live or requested route. Using FALLBACK route: ${routeId}`);
      }
    }
    
    if (!routeId) {
      return res.status(404).json({ message: 'No route could be determined for this bus.' });
    }
    
    // Get all stops for the determined route
    const stopsQuery = `
      SELECT 
        s.stop_id, s.stop_name, s.stop_lat, s.stop_lon, s.sequence_no,
        r.source_name, r.destination_name
      FROM stops s
      JOIN routes r ON s.route_id = r.route_id
      WHERE s.route_id = ?
      ORDER BY s.sequence_no
    `;
    
    const [stops] = await db.query(stopsQuery, [routeId]);
    
    if (stops.length === 0) {
        console.warn(`No stops found for route_id: ${routeId}`);
        // Return a valid response with an empty timeline
        return res.json({
            success: true,
            data: {
                bus: { bus_id: bus.bus_id, bus_number: bus.bus_number, status: bus.status },
                route: { route_id: routeId, total_stops: 0 },
                timeline: { stops: [], current_stop_index: 0, last_updated: new Date().toISOString() }
            }
        });
    }

    console.log('🗺️ Found', stops.length, 'stops for route', routeId);
    
    // --- Mock timeline generation (can be replaced with real-time data) ---
    const transformedStops = stops.map((stop, index) => {
      // Mock the bus's current position to be about a third of the way through
      const currentStopMockIndex = Math.floor(stops.length / 3);
      
      let status = 'upcoming';
      if (index < currentStopMockIndex) status = 'completed';
      if (index === currentStopMockIndex) status = 'current';
      
      const baseTime = new Date();
      baseTime.setHours(9, 0, 0); // Start journey at 9 AM for consistent timing
      baseTime.setMinutes(baseTime.getMinutes() + (index * 15)); // 15 min between stops
      
      return {
        id: stop.stop_id,
        name: stop.stop_name,
        arrivalTime: baseTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: status,
        distance: Math.round(index * 2.5), // Mock distance
        eta: status === 'completed' ? 'Passed' : (status === 'current' ? 'Now' : `${(index - currentStopMockIndex) * 15} min`),
        latitude: stop.stop_lat || 0,
        longitude: stop.stop_lon || 0,
        stop_order: stop.sequence_no
      };
    });

    // --- Final JSON Response ---
    const response = {
      success: true,
      data: {
        bus: {
          bus_id: bus.bus_id,
          bus_number: bus.bus_number,
          status: bus.status || 'available'
        },
        route: {
          route_id: routeId,
          route_name: `${stops[0].source_name} to ${stops[0].destination_name}`,
          source_stop: stops[0].source_name,
          destination_stop: stops[stops.length - 1].source_name, // Note: This might need schema adjustment
          total_stops: transformedStops.length
        },
        timeline: {
          stops: transformedStops,
          current_stop_index: Math.floor(transformedStops.length / 3),
          last_updated: new Date().toISOString()
        }
      }
    };

    console.log('✅ Returning timeline with', transformedStops.length, 'stops for route', routeId);
    res.json(response);
    
  } catch (error) {
    console.error('❌ Error fetching bus route stops:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching route stops',
      error: error.message 
    });
  }
};
// Simple test endpoint to check database connectivity
exports.testBusData = async (req, res) => {
  try {
    const [buses] = await db.query('SELECT * FROM buses LIMIT 5');
    const [routes] = await db.query('SELECT * FROM routes LIMIT 3');
    const [stops] = await db.query('SELECT * FROM stops LIMIT 5');
    const [drivers] = await db.query('SELECT * FROM drivers LIMIT 3');
    
    res.json({
      success: true,
      data: {
        buses_count: buses.length,
        routes_count: routes.length,
        stops_count: stops.length,
        drivers_count: drivers.length,
        sample_data: {
          bus: buses[0] || null,
          route: routes[0] || null,
          stop: stops[0] || null,
          driver: drivers[0] || null
        }
      }
    });
  } catch (error) {
    console.error('Error testing bus data:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};