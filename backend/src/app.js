const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

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

    console.log("user.password",user.password);
    console.log("password", password);

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
