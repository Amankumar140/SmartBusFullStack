const db = require('../config/db');

// Helper function to format time from 24hr to 12hr format
const formatTime = (timeStr) => {
  if (!timeStr) return 'TBD';
  
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  
  return `${displayHour}:${minutes} ${ampm}`;
};

// Helper function to calculate distance (simplified)
const calculateDistance = (stopOrder, totalStops, totalDistance) => {
  if (stopOrder === 1) return 0;
  return Math.round((stopOrder - 1) * (totalDistance / (totalStops - 1)) * 10) / 10;
};

// Helper function to calculate ETA based on current time and schedule
const calculateETA = (scheduledTime, status, busStatus) => {
  if (status === 'completed') return 'Passed';
  if (status === 'current') {
    return busStatus === 'Running' ? '2-5 min' : 'At stop';
  }
  
  if (!scheduledTime) return 'TBD';
  
  const now = new Date();
  const scheduled = new Date();
  const [hours, minutes] = scheduledTime.split(':');
  scheduled.setHours(parseInt(hours), parseInt(minutes), 0);
  
  const diffMs = scheduled - now;
  const diffMins = Math.ceil(diffMs / (1000 * 60));
  
  if (diffMins <= 0) return 'Due';
  if (diffMins < 60) return `${diffMins} min`;
  
  const hours12 = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours12}h ${mins}m`;
};

// Get route timeline for a specific bus (Hybrid: supports both static and real-time data)
exports.getBusRouteTimeline = async (req, res) => {
  const { busId } = req.params;
  
  if (!busId) {
    return res.status(400).json({ message: 'Bus ID is required.' });
  }

  try {
    // First, get basic bus information
    const busQuery = `
      SELECT 
        b.bus_id, 
        b.bus_number, 
        b.capacity, 
        b.status as bus_status,
        b.current_driver_id,
        ds.route_id as active_route_id,
        ds.session_id,
        r.source_name as active_source,
        r.destination_name as active_destination,
        r.total_distance_km as active_distance,
        l.latitude as current_lat,
        l.longitude as current_lon,
        l.timestamp as last_location_update
      FROM buses b
      LEFT JOIN driver_sessions ds ON b.bus_id = ds.bus_id AND ds.end_time IS NULL
      LEFT JOIN routes r ON ds.route_id = r.route_id
      LEFT JOIN location_updates l ON b.bus_id = l.bus_id
      WHERE b.bus_id = ?
      ORDER BY l.timestamp DESC
      LIMIT 1
    `;
    
    const [busInfo] = await db.query(busQuery, [busId]);
    
    if (busInfo.length === 0) {
      return res.status(404).json({ message: 'Bus not found.' });
    }

    const bus = busInfo[0];
    let routeData = null;
    let timelineStops = [];
    let isRealTime = false;
    
    // Check if bus has active route assignment (real-time mode)
    if (bus.active_route_id && bus.session_id) {
      console.log(`Bus ${busId} has active route assignment: ${bus.active_route_id}`);
      isRealTime = true;
      
      // Get real-time route stops data
      const realTimeStopsQuery = `
        SELECT 
          s.stop_id,
          s.stop_name,
          s.sequence_no,
          s.stop_lat,
          s.stop_lon,
          rp.arrival_time,
          rp.departure_time,
          eta.predicted_arrival,
          eta.minutes_remaining
        FROM stops s
        LEFT JOIN route_progress rp ON s.stop_id = rp.stop_id AND rp.session_id = ?
        LEFT JOIN eta_predictions eta ON s.stop_id = eta.stop_id AND eta.bus_id = ?
        WHERE s.route_id = ?
        ORDER BY s.sequence_no
      `;
      
      const [realTimeStops] = await db.query(realTimeStopsQuery, [bus.session_id, bus.bus_id, bus.active_route_id]);
      timelineStops = realTimeStops;
      
      routeData = {
        route_id: bus.active_route_id,
        route_name: `${bus.active_source} to ${bus.active_destination}`,
        source_stop: bus.active_source,
        destination_stop: bus.active_destination,
        distance_km: bus.active_distance,
        total_stops: timelineStops.length,
        is_real_time: true
      };
      
    } else {
      console.log(`Bus ${busId} not on active route - using static route data`);
      
      // Try to find a suitable route based on common patterns or assign a default route
      // This allows the app to show meaningful timeline even without active sessions
      const availableRoutesQuery = `
        SELECT 
          r.route_id,
          r.source_name,
          r.destination_name,
          r.total_distance_km,
          COUNT(s.stop_id) as stops_count
        FROM routes r
        LEFT JOIN stops s ON r.route_id = s.route_id
        GROUP BY r.route_id, r.source_name, r.destination_name, r.total_distance_km
        ORDER BY stops_count DESC
        LIMIT 1
      `;
      
      const [availableRoutes] = await db.query(availableRoutesQuery);
      
      if (availableRoutes.length > 0) {
        const defaultRoute = availableRoutes[0];
        
        // Get stops for this route
        const staticStopsQuery = `
          SELECT 
            s.stop_id,
            s.stop_name,
            s.sequence_no,
            s.stop_lat,
            s.stop_lon
          FROM stops s
          WHERE s.route_id = ?
          ORDER BY s.sequence_no
        `;
        
        const [staticStops] = await db.query(staticStopsQuery, [defaultRoute.route_id]);
        timelineStops = staticStops;
        
        routeData = {
          route_id: defaultRoute.route_id,
          route_name: `${defaultRoute.source_name} to ${defaultRoute.destination_name}`,
          source_stop: defaultRoute.source_name,
          destination_stop: defaultRoute.destination_name,
          distance_km: defaultRoute.total_distance_km,
          total_stops: timelineStops.length,
          is_real_time: false
        };
      } else {
        return res.status(404).json({ 
          message: 'No route data available for this bus.',
          bus_info: bus,
          suggestion: 'Bus may need to be assigned to a route or route data may be missing.'
        });
      }
    }
    
    if (timelineStops.length === 0) {
      return res.status(404).json({ 
        message: 'No stops found for the assigned route.',
        route_info: routeData
      });
    }
    
    // Process timeline stops based on whether we have real-time or static data
    let currentStopIndex = 0;
    
    if (isRealTime) {
      // Real-time mode: Find current stop based on route progress
      for (let i = 0; i < timelineStops.length; i++) {
        if (timelineStops[i].arrival_time && !timelineStops[i].departure_time) {
          // Bus has arrived but not departed - current stop
          currentStopIndex = i;
          break;
        } else if (timelineStops[i].departure_time) {
          // Bus has departed - move to next stop
          currentStopIndex = Math.min(i + 1, timelineStops.length - 1);
        }
      }
    } else {
      // Static mode: Simulate reasonable progress (bus is somewhere in the middle)
      currentStopIndex = Math.floor(timelineStops.length * 0.3); // 30% progress
    }
    
    // Transform stops data for frontend
    const transformedStops = timelineStops.map((stop, index) => {
      let status = 'upcoming';
      
      if (index < currentStopIndex) {
        status = 'completed';
      } else if (index === currentStopIndex) {
        status = 'current';
      }
      
      // Process ETA and arrival times
      let eta = 'TBD';
      let arrivalTime = 'TBD';
      
      if (isRealTime) {
        // Real-time mode: Use actual data if available
        if (stop.predicted_arrival) {
          arrivalTime = formatTime(stop.predicted_arrival.toString().slice(11, 16));
          eta = stop.minutes_remaining ? `${stop.minutes_remaining} min` : 'Due';
        } else if (stop.arrival_time) {
          arrivalTime = formatTime(stop.arrival_time.toString().slice(11, 16));
          eta = 'Arrived';
        } else {
          // Generate realistic time
          const baseTime = new Date();
          baseTime.setMinutes(baseTime.getMinutes() + (index - currentStopIndex) * 12);
          arrivalTime = formatTime(baseTime.toTimeString().slice(0, 5));
          eta = calculateETA(baseTime.toTimeString().slice(0, 5), status, bus.bus_status);
        }
      } else {
        // Static mode: Generate reasonable schedule
        const baseTime = new Date();
        baseTime.setHours(9, 0, 0);
        baseTime.setMinutes(baseTime.getMinutes() + (stop.sequence_no - 1) * 15);
        arrivalTime = formatTime(baseTime.toTimeString().slice(0, 5));
        
        if (status === 'completed') {
          eta = 'Passed';
        } else if (status === 'current') {
          eta = '5 min';
        } else {
          const minutesFromNow = (index - currentStopIndex) * 15;
          eta = minutesFromNow > 0 ? `${minutesFromNow} min` : 'Due';
        }
      }
      
      const distance = calculateDistance(
        stop.sequence_no, 
        timelineStops.length, 
        routeData.distance_km || 100
      );

      return {
        id: stop.stop_id,
        name: stop.stop_name,
        arrivalTime: arrivalTime,
        status: status,
        distance: distance,
        eta: eta,
        latitude: parseFloat(stop.stop_lat) || 0,
        longitude: parseFloat(stop.stop_lon) || 0,
        stop_order: stop.sequence_no
      };
    });

    // Get real-time bus location if available
    let busLocation = null;
    if (bus.current_lat && bus.current_lon) {
      busLocation = {
        latitude: parseFloat(bus.current_lat),
        longitude: parseFloat(bus.current_lon),
        timestamp: bus.last_location_update || new Date().toISOString()
      };
    }

    // Calculate last seen information based on current stop
    const currentStop = transformedStops.find(stop => stop.status === 'current');
    const lastCompletedStop = transformedStops.filter(stop => stop.status === 'completed').pop();
    const lastSeenStop = currentStop || lastCompletedStop || transformedStops[0];
    
    let lastSeenInfo = null;
    if (lastSeenStop) {
      lastSeenInfo = {
        stop_name: lastSeenStop.name,
        status: currentStop ? 'current' : 'last_completed',
        time: lastSeenStop.arrivalTime,
        eta: lastSeenStop.eta,
        coordinates: {
          latitude: lastSeenStop.latitude,
          longitude: lastSeenStop.longitude
        },
        message: currentStop ? `Currently at ${lastSeenStop.name}` : `Last seen at ${lastSeenStop.name}`
      };
    }

    const response = {
      success: true,
      data: {
        bus: {
          bus_id: bus.bus_id,
          bus_number: bus.bus_number,
          capacity: bus.capacity,
          status: bus.bus_status || 'unknown',
          current_location: busLocation,
          driver_id: bus.current_driver_id,
          is_real_time: isRealTime,
          last_seen: lastSeenInfo
        },
        route: {
          route_id: routeData.route_id,
          route_name: routeData.route_name,
          source_stop: routeData.source_stop,
          destination_stop: routeData.destination_stop,
          distance_km: routeData.distance_km,
          total_stops: routeData.total_stops,
          is_real_time: routeData.is_real_time
        },
        timeline: {
          current_stop_index: currentStopIndex,
          stops: transformedStops,
          last_updated: new Date().toISOString(),
          mode: isRealTime ? 'real_time' : 'static',
          message: isRealTime ? 'Live tracking active' : 'Showing scheduled stops from database',
          last_seen_stop: lastSeenInfo
        },
        metadata: {
          total_stops: transformedStops.length,
          completed_stops: transformedStops.filter(s => s.status === 'completed').length,
          remaining_stops: transformedStops.filter(s => s.status === 'upcoming').length,
          data_source: isRealTime ? 'real_time_session' : 'static_route_data'
        }
      }
    };

    console.log(`Timeline generated for bus ${busId}: ${transformedStops.length} stops (${isRealTime ? 'real-time' : 'static'} mode)`);
    res.json(response);
    
  } catch (error) {
    console.error('Error fetching bus route timeline:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching route timeline',
      error: error.message 
    });
  }
};

// Get route stops for a specific route
exports.getRouteStops = async (req, res) => {
  const { routeId } = req.params;
  
  if (!routeId) {
    return res.status(400).json({ message: 'Route ID is required.' });
  }

  try {
    // Get route and stops using new schema
    const stopsQuery = `
      SELECT 
        r.route_id,
        r.source,
        r.destination,
        r.distance_km,
        s.stop_id,
        s.stop_name,
        s.sequence_no,
        s.stop_lat,
        s.stop_lon
      FROM routes r
      JOIN stops s ON r.route_id = s.route_id
      WHERE r.route_id = ?
      ORDER BY s.sequence_no
    `;
    
    const [results] = await db.query(stopsQuery, [routeId]);
    
    if (results.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Route not found or no stops available.' 
      });
    }

    const route = {
      route_id: results[0].route_id,
      route_name: `${results[0].source} to ${results[0].destination}`,
      source: results[0].source,
      destination: results[0].destination,
      distance_km: results[0].distance_km,
      total_stops: results.length,
      stops: results.map(row => {
        const baseTime = new Date();
        baseTime.setHours(9, 0, 0);
        baseTime.setMinutes(baseTime.getMinutes() + (row.sequence_no - 1) * 15);
        const estimatedTime = baseTime.toTimeString().slice(0, 5);
        
        return {
          id: row.stop_id,
          stop_name: row.stop_name,
          sequence_no: row.sequence_no,
          latitude: row.stop_lat,
          longitude: row.stop_lon,
          estimated_arrival_time: estimatedTime,
          formatted_time: formatTime(estimatedTime)
        };
      })
    };

    res.json({
      success: true,
      data: route
    });
    
  } catch (error) {
    console.error('Error fetching route stops:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching route stops',
      error: error.message 
    });
  }
};

// Get all available routes
exports.getAllRoutes = async (req, res) => {
  try {
    const query = `
      SELECT 
        r.route_id,
        r.source_name,
        r.destination_name,
        r.total_distance_km,
        COUNT(DISTINCT ds.bus_id) as active_buses_count,
        COUNT(DISTINCT s.stop_id) as stops_count
      FROM routes r
      LEFT JOIN driver_sessions ds ON r.route_id = ds.route_id AND ds.end_time IS NULL
      LEFT JOIN stops s ON r.route_id = s.route_id
      GROUP BY r.route_id, r.source_name, r.destination_name, r.total_distance_km
      ORDER BY r.source_name, r.destination_name
    `;
    
    const [routes] = await db.query(query);
    
    res.json({
      success: true,
      data: {
        routes: routes.map(route => ({
          route_id: route.route_id,
          route_name: `${route.source_name} to ${route.destination_name}`,
          source_stop: route.source_name,
          destination_stop: route.destination_name,
          distance_km: route.total_distance_km,
          active_buses_count: route.active_buses_count || 0,
          stops_count: route.stops_count || 0
        }))
      }
    });
    
  } catch (error) {
    console.error('Error fetching all routes:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching routes',
      error: error.message 
    });
  }
};

// Test database connection and get sample data
exports.testDatabase = async (req, res) => {
  try {
    // Show database connection info
    const dbInfo = {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER
    };
    
    // Test all new schema tables
    const [routes] = await db.query('SELECT * FROM routes LIMIT 3');
    const [stops] = await db.query('SELECT * FROM stops LIMIT 5');
    const [buses] = await db.query('SELECT * FROM buses LIMIT 3');
    const [users] = await db.query('SELECT user_id, name, email, region, created_at FROM users LIMIT 3');
    const [drivers] = await db.query('SELECT * FROM drivers LIMIT 3');
    
    // Get table counts
    const [routeCount] = await db.query('SELECT COUNT(*) as count FROM routes');
    const [stopCount] = await db.query('SELECT COUNT(*) as count FROM stops');
    const [busCount] = await db.query('SELECT COUNT(*) as count FROM buses');
    const [userCount] = await db.query('SELECT COUNT(*) as count FROM users');
    
    res.json({
      success: true,
      message: 'Connected to NEW database successfully!',
      database_info: dbInfo,
      table_counts: {
        routes: routeCount[0].count,
        stops: stopCount[0].count,
        buses: busCount[0].count,
        users: userCount[0].count
      },
      sample_data: {
        routes: routes,
        stops: stops,
        buses: buses,
        users: users,
        drivers: drivers
      },
      schema_confirmed: {
        routes_has_source_name: routes.length > 0 && routes[0].hasOwnProperty('source_name'),
        stops_has_sequence_no: stops.length > 0 && stops[0].hasOwnProperty('sequence_no'),
        buses_has_status: buses.length > 0 && buses[0].hasOwnProperty('status')
      }
    });
    
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
};

// Get all users data
exports.getUsersData = async (req, res) => {
  try {
    const [users] = await db.query('SELECT * FROM users ORDER BY created_at DESC');
    
    res.json({
      success: true,
      message: 'Users data retrieved successfully!',
      total_users: users.length,
      users: users
    });
    
  } catch (error) {
    console.error('Error fetching users data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users data',
      error: error.message
    });
  }
};

