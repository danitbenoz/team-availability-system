const express = require("express");
require('dotenv').config();
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
