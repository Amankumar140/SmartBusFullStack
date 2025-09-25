const db = require('../config/db');

// Controller to get notifications for the logged-in user
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, priority, is_read, limit = 50, offset = 0 } = req.query;

    let sql = `
      SELECT 
        n.notification_id,
        n.user_id,
        n.title,
        n.message,
        n.type,
        n.priority,
        n.is_read,
        n.bus_id,
        n.route_id,
        n.created_at,
        b.bus_number,
        r.source_name,
        r.destination_name
      FROM notifications n
      LEFT JOIN buses b ON n.bus_id = b.bus_id
      LEFT JOIN routes r ON n.route_id = r.route_id
      WHERE n.user_id = ?
    `;
    
    const params = [userId];
    
    // Add filters
    if (type) {
      sql += ' AND n.type = ?';
      params.push(type);
    }
    
    if (priority) {
      sql += ' AND n.priority = ?';
      params.push(priority);
    }
    
    if (is_read !== undefined) {
      sql += ' AND n.is_read = ?';
      params.push(is_read === 'true' ? 1 : 0);
    }
    
    sql += ' ORDER BY n.created_at DESC, n.priority DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [notifications] = await db.query(sql, params);

    // Get unread count
    const [unreadResult] = await db.query(
      'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );

    res.json({
      success: true,
      notifications: notifications,
      unread_count: unreadResult[0].unread_count,
      total_count: notifications.length
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;
    
    if (!notificationId) {
      return res.status(400).json({
        success: false,
        message: 'Notification ID is required'
      });
    }

    // Update notification to mark as read, but only if it belongs to the user
    const [result] = await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE notification_id = ? AND user_id = ?',
      [notificationId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or does not belong to user'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Mark all notifications as read for a user
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    const [result] = await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );

    res.json({
      success: true,
      message: `${result.affectedRows} notifications marked as read`
    });

  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Create a new notification (admin function or internal use)
exports.createNotification = async (req, res) => {
  try {
    const {
      user_id,
      title,
      message,
      type = 'general',
      priority = 'medium',
      bus_id = null,
      route_id = null
    } = req.body;

    // Validation
    if (!user_id || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'user_id, title, and message are required'
      });
    }

    // Valid types and priorities
    const validTypes = ['bus_arrival', 'bus_delay', 'bus_cancelled', 'route_change', 'service_alert', 'emergency', 'general'];
    const validPriorities = ['low', 'medium', 'high', 'urgent'];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`
      });
    }

    // Insert notification
    const [result] = await db.query(
      `INSERT INTO notifications (user_id, title, message, type, priority, bus_id, route_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user_id, title, message, type, priority, bus_id, route_id]
    );

    // Get the created notification with related data
    const [newNotification] = await db.query(
      `SELECT 
        n.*,
        b.bus_number,
        r.source_name,
        r.destination_name
      FROM notifications n
      LEFT JOIN buses b ON n.bus_id = b.bus_id
      LEFT JOIN routes r ON n.route_id = r.route_id
      WHERE n.notification_id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      notification: newNotification[0]
    });

  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get unread notification count
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const [result] = await db.query(
      'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );

    res.json({
      success: true,
      unread_count: result[0].unread_count
    });

  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;
    
    if (!notificationId) {
      return res.status(400).json({
        success: false,
        message: 'Notification ID is required'
      });
    }

    const [result] = await db.query(
      'DELETE FROM notifications WHERE notification_id = ? AND user_id = ?',
      [notificationId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or does not belong to user'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};
