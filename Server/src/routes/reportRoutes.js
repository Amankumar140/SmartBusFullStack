const express = require('express');
const router = express.Router();
const multer = require('multer');
const authMiddleware = require('../middleware/authMiddleware');
const { submitReport, getAllReports, getUserReports } = require('../controllers/reportController');

// Configure multer to store uploaded files in an 'uploads' directory
const upload = multer({ dest: 'uploads/' });

// The middleware chain: 1. Check auth, 2. Handle single image upload named 'image', 3. Run controller
router.post('/', authMiddleware, upload.single('image'), submitReport);

// Get all reports (admin)
router.get('/all', authMiddleware, getAllReports);

// Get user's own reports
router.get('/my-reports', authMiddleware, getUserReports);

module.exports = router;
