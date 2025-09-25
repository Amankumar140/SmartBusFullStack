const express = require("express");
const router = express.Router();
const validate = require("../middleware/validate"); // <-- 1. IMPORT MIDDLEWARE
const { signupSchema, loginSchema } = require("../validation/authSchema");

// We will create this controller function in the next step
const { signup, login } = require("../controllers/authController");

// This defines the /signup endpoint.
// It will accept POST requests and be handled by the signup function.
router.post("/signup", validate(signupSchema), signup);
router.post("/login", validate(loginSchema), login); // <-- ADD THIS LINE

module.exports = router;
