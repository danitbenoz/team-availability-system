const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { query } = require("../config/database");

const router = express.Router();

// Handle user login

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Make sure both username and password are provided
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: "Username and password are required",
      });
    }

    // Look up user in database with their current status
    const userResult = await query(
      `SELECT u.id, u.username, u.password, u.email, u.full_name,
              s.name as current_status, s.id as status_id
       FROM users u
       LEFT JOIN statuses s ON u.current_status_id = s.id
       WHERE u.username = $1`,
      [username]
    );

    // User doesn't exist
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: "Invalid username or password",
      });
    }

    const user = userResult.rows[0];

    // Check if password matches the hashed version in database
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: "Invalid username or password",
      });
    }

    // Create a JWT token that expires in 24 hours
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Send back user info and token
    res.json({
      success: true,
      message: "Login successful!",
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        email: user.email,
        currentStatus: user.current_status || "Working",
        statusId: user.status_id,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message,
    });
  }
});

module.exports = router;
