const db = require('../config/db');

exports.getProfile = async (req, res) => {
  try {
    // req.user.id was attached by our authMiddleware
    const userId = req.user.id;

    // Fetch user from database, but DO NOT include the password - UPDATED FOR NEW SCHEMA
    const [users] = await db.query(
      'SELECT user_id, name, age, mobile, email FROM users WHERE user_id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(users[0]);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};