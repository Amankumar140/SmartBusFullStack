const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { 
  getAllBuses, 
  searchBuses, 
  getAllBusStops,
  getRouteLocations,
  getBusRouteStops, 
  getBusLocations,
  getBusDetails,
  testBusData
} = require('../controllers/busController');

// Get all buses
router.get('/', authMiddleware, getAllBuses);

// Search buses by source and destination
router.get('/search', authMiddleware, searchBuses);

// Get all bus stops
router.get('/stops', authMiddleware, getAllBusStops);

// Get all route locations (sources and destinations)
router.get('/route-locations', authMiddleware, getRouteLocations);

// Get real-time bus locations
router.get('/locations', authMiddleware, getBusLocations);

// Get detailed bus information
router.get('/:busId/details', authMiddleware, getBusDetails);

// Get route stops for a specific bus (for timeline)
router.get('/:busId/route-stops', authMiddleware, getBusRouteStops);

// Test endpoint to check database
router.get('/test/data', testBusData);

module.exports = router;
