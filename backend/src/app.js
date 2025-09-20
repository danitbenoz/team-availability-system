const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const authenticateToken = require('./middleware/authenticateToken');

const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 5000;

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "team_availability",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
});

//test database connection when startup
pool.on("connect", () => {
  console.log("Database connected successfully");
});

pool.on("error", (err) => {
  console.error("Database connection error:", err);
});

//security middleware
app.use(helmet());
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production" ? ["http://localhost:3000"] : true,
    credentials: true,
  })
);

// body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", async (req, res) => {
  try {
    const dbTest = await pool.query("SELECT NOW() as current_time");
    res.json({
      status: "OK",
      message: "Server is running with database!",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      database: "Connected",
      dbTime: dbTest.rows[0].current_time,
    });
  } catch (error) {
    console.error("Health check database error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Database connection failed",
      error: error.message,
    });
  }
});

// update login endpoint
app.post("/api/auth/login", async (req, res) => {
  try {
    console.log("Login attempt:", req.body);

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: "Username and password are required",
      });
    }

    // Query database for user
    const userResult = await pool.query(
      `SELECT u.id, u.username, u.password, u.email, u.full_name, 
              s.name as current_status, s.id as status_id
       FROM users u 
       LEFT JOIN statuses s ON u.current_status_id = s.id 
       WHERE u.username = $1`,
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: "Invalid username or password",
      });
    }

    const user = userResult.rows[0];

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid username or password" });
    }

    // Generate real JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

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

app.get("/api/statuses", async (req, res) => {
  try {
    console.log("Fetching statuses from database...");

    const result = await pool.query(
      "SELECT id, name, created_at FROM statuses ORDER BY id ASC"
    );

    console.log(`Found ${result.rows.length} statuses in database`);

    res.json({
      success: true,
      statuses: result.rows.map((status) => ({
        id: status.id,
        name: status.name,
        createdAt: status.created_at,
      })),
      total: result.rows.length,
    });
  } catch (error) {
    console.error("Database error fetching statuses:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch statuses from database",
      message: error.message,
    });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    console.log("Fetching users from database...");

    const result = await pool.query(`
      SELECT u.id, u.username, u.full_name, u.email,
             s.name as current_status, s.id as status_id,
             u.created_at, u.updated_at
      FROM users u 
      LEFT JOIN statuses s ON u.current_status_id = s.id 
      ORDER BY u.id ASC
    `);

    console.log(`Found ${result.rows.length} users in database`);

    res.json({
      success: true,
      users: result.rows.map((user) => ({
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        email: user.email,
        currentStatus: user.current_status || "Working",
        statusId: user.status_id,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      })),
      total: result.rows.length,
    });
  } catch (error) {
    console.error("Database error fetching users:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch users from database",
      message: error.message,
    });
  }
});

// Get current user profile (protected)
app.get("/api/users/me", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id; // From JWT token

    const result = await pool.query(
      `
      SELECT u.id, u.username, u.full_name, u.email,
             s.name as current_status, s.id as status_id,
             u.created_at, u.updated_at
      FROM users u 
      LEFT JOIN statuses s ON u.current_status_id = s.id 
      WHERE u.id = $1
    `,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        email: user.email,
        currentStatus: user.current_status || "Working",
        statusId: user.status_id,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    });
  } catch (error) {
    console.error("Error fetching current user:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user profile",
      message: error.message,
    });
  }
});

// Update current user's status (protected)
app.put("/api/users/me/status", authenticateToken, async (req, res) => {
  try {
    let { statusId } = req.body;
    const userId = req.user.id; // From JWT token

    statusId = Number(statusId);
    if (!statusId) {
      return res.status(400).json({
        success: false,
        error: "Status ID is required",
      });
    }

    // Verify status exists
    const statusCheck = await pool.query(
      "SELECT id, name FROM statuses WHERE id = $1",
      [statusId]
    );

    if (statusCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid status ID",
      });
    }

    // Update user status
    const result = await pool.query(
      "UPDATE users SET current_status_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
      [statusId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const status = statusCheck.rows[0];
    res.json({
      success: true,
      message: `Status updated to "${status.name}"`,
      user: {
        id: result.rows[0].id,
        username: result.rows[0].username,
        fullName: result.rows[0].full_name,
        currentStatus: status.name,
        statusId: status.id,
      },
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update user status",
      message: error.message,
    });
  }
});

// Update user status endpoint
app.put("/api/users/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { statusId } = req.body;

    if (!statusId) {
      return res.status(400).json({
        success: false,
        error: "Status ID is required",
      });
    }

    // Verify status exists
    const statusCheck = await pool.query(
      "SELECT id, name FROM statuses WHERE id = $1",
      [statusId]
    );

    if (statusCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid status ID",
      });
    }

    // Update user status
    const result = await pool.query(
      "UPDATE users SET current_status_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
      [statusId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const status = statusCheck.rows[0];
    res.json({
      success: true,
      message: `Status updated to "${status.name}"`,
      user: {
        id: result.rows[0].id,
        username: result.rows[0].username,
        currentStatus: status.name,
        statusId: status.id,
      },
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update user status",
      message: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(
    `Database: ${process.env.DB_HOST || "localhost"}:${
      process.env.DB_PORT || 5432
    }/${process.env.DB_NAME || "team_availability"}`
  );
});

module.exports = app;
