const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getProfile } = require('../controllers/userController'); // We'll create this next

// This route is protected. The authMiddleware will run first.
// If the token is valid, it will then call getProfile.
router.get('/profile', authMiddleware, getProfile);

module.exports = router;