const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Middleware to verify token (assuming you have this from other routes)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Save chat message to database
router.post('/save', authenticateToken, async (req, res) => {
  try {
    const { user_id, user_message, bot_response } = req.body;

    if (!user_id || !user_message || !bot_response) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: user_id, user_message, bot_response'
      });
    }

    // Insert user message
    const userMessageQuery = `
      INSERT INTO chatlogs (user_id, sender, message, created_at) 
      VALUES (?, 'user', ?, NOW())
    `;
    await db.query(userMessageQuery, [user_id, user_message]);

    // Insert bot response
    const botMessageQuery = `
      INSERT INTO chatlogs (user_id, sender, message, created_at) 
      VALUES (?, 'bot', ?, NOW())
    `;
    await db.query(botMessageQuery, [user_id, bot_response]);

    res.json({
      success: true,
      message: 'Chat messages saved successfully'
    });

  } catch (error) {
    console.error('Error saving chat:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save chat messages',
      error: error.message
    });
  }
});

// Get chat history for a user
router.get('/history/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const query = `
      SELECT id, sender, message, created_at
      FROM chatlogs 
      WHERE user_id = ? 
      ORDER BY created_at ASC
      LIMIT 100
    `;

    const [messages] = await db.query(query, [userId]);

    res.json({
      success: true,
      messages: messages,
      count: messages.length
    });

  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat history',
      error: error.message
    });
  }
});

// Clear chat history for a user
router.delete('/clear/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const query = 'DELETE FROM chatlogs WHERE user_id = ?';
    const [result] = await db.query(query, [userId]);

    res.json({
      success: true,
      message: 'Chat history cleared successfully',
      deletedCount: result.affectedRows
    });

  } catch (error) {
    console.error('Error clearing chat history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear chat history',
      error: error.message
    });
  }
});

// Get chat statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const totalChatsQuery = 'SELECT COUNT(*) as total FROM chatlogs';
    const [totalResult] = await db.query(totalChatsQuery);

    const userChatsQuery = `
      SELECT user_id, COUNT(*) as message_count 
      FROM chatlogs 
      GROUP BY user_id 
      ORDER BY message_count DESC 
      LIMIT 10
    `;
    const [userStats] = await db.query(userChatsQuery);

    const recentChatsQuery = `
      SELECT cl.*, u.name as user_name 
      FROM chatlogs cl 
      LEFT JOIN users u ON cl.user_id = u.user_id 
      ORDER BY cl.created_at DESC 
      LIMIT 20
    `;
    const [recentChats] = await db.query(recentChatsQuery);

    res.json({
      success: true,
      stats: {
        totalMessages: totalResult[0].total,
        userStats: userStats,
        recentChats: recentChats
      }
    });

  } catch (error) {
    console.error('Error fetching chat statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat statistics',
      error: error.message
    });
  }
});

module.exports = router;