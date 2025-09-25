const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { 
  getNotifications, 
  markAsRead, 
  markAllAsRead, 
  createNotification, 
  getUnreadCount, 
  deleteNotification 
} = require('../controllers/notificationController');

// Get notifications with filtering and pagination
router.get('/', authMiddleware, getNotifications);

// Get unread notification count
router.get('/unread-count', authMiddleware, getUnreadCount);

// Mark a specific notification as read
router.patch('/:notificationId/read', authMiddleware, markAsRead);

// Mark all notifications as read for the user
router.patch('/mark-all-read', authMiddleware, markAllAsRead);

// Create a new notification (admin or system use)
router.post('/', authMiddleware, createNotification);

// Delete a specific notification
router.delete('/:notificationId', authMiddleware, deleteNotification);

module.exports = router;
