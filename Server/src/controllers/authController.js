const bcrypt = require('bcryptjs');
const db = require('../config/db');
const jwt = require('jsonwebtoken');

// The 'signup' function that will be called by our route
exports.signup = async (req, res) => {
  // Get user data from the request body - UPDATED FOR NEW SCHEMA
  const { name, age, mobile, email, password } = req.body;

  try {
    console.log('📥 Signup request received:', { name, mobile, age, email, password: '***' });
    
    // --- Basic Validation ---
    if (!name || !mobile || !password) {
      console.log('❌ Basic validation failed:', { name: !!name, mobile: !!mobile, password: !!password });
      return res.status(400).json({ message: 'Name, mobile number, and password are required' });
    }
    
    // Validate mobile number format (10 digits)
    if (!/^\d{10}$/.test(mobile)) {
      console.log('❌ Mobile validation failed:', mobile, 'Length:', mobile.length);
      return res.status(400).json({ message: 'Mobile number must be 10 digits' });
    }
    console.log('✅ Mobile validation passed:', mobile);

    // --- Password Hashing ---
    // First, check if a password was provided
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }
    // Create a "salt" for hashing
    const salt = await bcrypt.genSalt(10);
    // Hash the password with the salt
    const hashedPassword = await bcrypt.hash(password, salt);

    // --- Database Insertion - UPDATED FOR NEW SCHEMA ---
    // Create the SQL query to insert a new user
    const sql = 'INSERT INTO users (name, age, mobile, email, password_hash) VALUES (?, ?, ?, ?, ?)';
    const values = [name, age || null, mobile, email || null, hashedPassword];

    // Execute the query
    await db.query(sql, values);

    // Send a success response back to the app
    res.status(201).json({ message: 'User created successfully!' });

  } catch (error) {
    console.error('Error signing up user:', error);
    // Handle potential errors, like a duplicate mobile number
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Mobile number or email already exists.' });
    }
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};


exports.login = async (req, res) => {
  const { mobile, password } = req.body;

  // Basic validation
  if (!mobile || !password) {
    return res.status(400).json({ message: 'Please provide mobile number and password.' });
  }

  try {
    // 1. Find the user in the database - UPDATED FOR NEW SCHEMA
    const [users] = await db.query('SELECT * FROM users WHERE mobile = ?', [mobile]);

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = users[0];

    // 2. Compare the provided password with the stored hash
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }
    
    // 3. If passwords match, create a JWT
    const payload = {
      user: {
        id: user.user_id,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' }, // Token will be valid for 7 days
      (err, token) => {
        if (err) throw err;
        res.json({ token }); // 4. Send the token to the client
      }
    );

  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};