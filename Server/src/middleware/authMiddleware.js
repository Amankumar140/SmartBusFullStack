const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMiddleware = (req, res, next) => {
  // 1. Get the token from the header
  const authHeader = req.header('Authorization');

  // 2. Check if token doesn't exist
  if (!authHeader) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  // Check if the token is in the correct 'Bearer <token>' format
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token format is incorrect, authorization denied' });
  }

  try {
    // 3. Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. If valid, attach the user's info to the request object
    req.user = decoded.user;
    next(); // Move on to the next function (the controller)
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = authMiddleware;