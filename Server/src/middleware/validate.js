// src/middleware/validate.js
const validate = (schema) => (req, res, next) => {
  try {
    // Zod's .parse() will throw an error if validation fails
    schema.parse(req.body);
    // If it succeeds, call next() to move to the controller
    next();
  } catch (error) {
    // Log the validation error details for debugging
    console.log('❌ Validation Error:', {
      body: req.body,
      errors: error.errors
    });
    
    // If it fails, send a 400 error with the validation issues
    return res.status(400).json({
      message: 'Invalid input data',
      errors: error.errors,
    });
  }
};

module.exports = validate;