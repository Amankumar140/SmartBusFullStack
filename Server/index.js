 
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const db = require('./src/config/db');

// Import all route handlers
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const busRoutes = require('./src/routes/busRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const chatRoutes = require('./src/routes/chatRoutes');
const routeRoutes = require('./src/routes/routeRoutes');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3001;

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/routes', routeRoutes);

// --- Socket.io Middleware for Authentication ---
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication Error: Token not provided'));
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error('Authentication Error: Invalid token'));
    }
    socket.userId = decoded.user.id;
    next();
  });
});

// --- Socket.io Connection Logic ---
io.on('connection', (socket) => {
  console.log(`User ${socket.userId} connected for real-time updates.`);
  socket.join(`user-${socket.userId}`); // For private notifications
  socket.on('disconnect', () => {
    console.log(`User ${socket.userId} disconnected.`);
  });
});

// --- REAL-TIME BUS TRACKING LOGIC ---
const trackBuses = async () => {
  try {
    const [buses] = await db.query(
      "SELECT b.bus_id, b.bus_number, b.status, l.latitude, l.longitude, l.timestamp FROM buses b LEFT JOIN location_updates l ON b.bus_id = l.bus_id WHERE b.status IN ('available','running') ORDER BY l.timestamp DESC LIMIT 50"
    );
    io.emit('bus-location-update', buses); // Broadcasts to ALL users
  } catch (error) {
    console.error('Error fetching bus data for real-time update:', error);
  }
};

// --- REAL-TIME NOTIFICATION LOGIC ---
const sendNotifications = async () => {
  try {
    // Get recent unread notifications for all users
    const [notifications] = await db.query(`
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
      WHERE n.is_read = FALSE 
      AND n.created_at > DATE_SUB(NOW(), INTERVAL 1 MINUTE)
      ORDER BY n.created_at DESC
    `);

    // Group notifications by user
    const notificationsByUser = {};
    notifications.forEach(notification => {
      if (!notificationsByUser[notification.user_id]) {
        notificationsByUser[notification.user_id] = [];
      }
      notificationsByUser[notification.user_id].push({
        notification_id: notification.notification_id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        priority: notification.priority,
        bus_id: notification.bus_id,
        route_id: notification.route_id,
        bus_number: notification.bus_number,
        source_name: notification.source_name,
        destination_name: notification.destination_name,
        created_at: notification.created_at,
        timestamp: notification.created_at
      });
    });

    // Send notifications to specific users
    for (const userId in notificationsByUser) {
      io.to(`user-${userId}`).emit('new_notification', notificationsByUser[userId]);
      console.log(`Sent ${notificationsByUser[userId].length} notifications to user ${userId}`);
    }

    // Broadcast urgent notifications to all connected users
    const urgentNotifications = notifications.filter(n => n.priority === 'urgent');
    if (urgentNotifications.length > 0) {
      io.emit('urgent_notifications', urgentNotifications.map(n => ({
        notification_id: n.notification_id,
        title: n.title,
        message: n.message,
        type: n.type,
        priority: n.priority,
        created_at: n.created_at
      })));
      console.log(`Broadcast ${urgentNotifications.length} urgent notifications`);
    }

  } catch (error) {
    console.error('Error sending notifications:', error);
  }
};

// Helper function to create and broadcast a notification
const createAndBroadcastNotification = async (notificationData) => {
  try {
    const {
      user_id,
      title,
      message,
      type = 'general',
      priority = 'medium',
      bus_id = null,
      route_id = null
    } = notificationData;

    // Insert notification into database
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

    const notification = newNotification[0];
    
    // Broadcast to specific user
    io.to(`user-${user_id}`).emit('new_notification', [{
      notification_id: notification.notification_id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      priority: notification.priority,
      bus_id: notification.bus_id,
      route_id: notification.route_id,
      bus_number: notification.bus_number,
      source_name: notification.source_name,
      destination_name: notification.destination_name,
      created_at: notification.created_at,
      timestamp: notification.created_at
    }]);

    // If urgent, broadcast to all users
    if (priority === 'urgent') {
      io.emit('urgent_notifications', [{
        notification_id: notification.notification_id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        priority: notification.priority,
        created_at: notification.created_at
      }]);
    }

    return notification;
  } catch (error) {
    console.error('Error creating and broadcasting notification:', error);
    throw error;
  }
};

// Export the helper function for use in other parts of the application
module.exports = { createAndBroadcastNotification };

// Start the server
server.listen(PORT, async () => {
  try {
    await db.query('SELECT 1');
    console.log('🎉 Database connected successfully!');

    // Start both real-time services
    setInterval(trackBuses, 20000);
    setInterval(sendNotifications, 20000);

  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
  console.log(`🚀 Server is listening on http://localhost:${PORT}`);
});