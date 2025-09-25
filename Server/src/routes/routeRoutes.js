const express = require('express');
const router = express.Router();
const {
  getBusRouteTimeline,
  getRouteStops,
  getAllRoutes,
  testDatabase,
  getUsersData
} = require('../controllers/routeController');

// Get route timeline for a specific bus
router.get('/bus/:busId/timeline', getBusRouteTimeline);

// Get route stops for a specific route
router.get('/:routeId/stops', getRouteStops);

// Get all available routes
router.get('/', getAllRoutes);

// Test database connection
router.get('/test-db', testDatabase);

// Get all users data
router.get('/users', getUsersData);

module.exports = router;