const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config(); // Load environment variables
const { pool } = require("./config/database");

// Import our route modules
const authRoutes = require("./routes/auth");
const usersRoutes = require("./routes/users");
const statusesRoutes = require("./routes/statuses");

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

// Security middleware - protects against common attacks
app.use(helmet());
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production" ? ["http://localhost:3000"] : true,
    credentials: true,
  })
);

// Parse JSON and form data from requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint - tells us if server and database are working
app.get("/health", async (req, res) => {
  try {
    // Test database connection
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

// Connect our route modules to specific paths
app.use("/api/auth", authRoutes);     // Login, logout, etc.
app.use("/api/users", usersRoutes);   // User profile, status updates
app.use("/api/statuses", statusesRoutes); // Available status options


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
