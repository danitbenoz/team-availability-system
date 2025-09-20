const { Pool } = require('pg');

// Create database connection pool - this manages multiple connections efficiently
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "team_availability",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
});

// Let us know when database connects successfully
pool.on("connect", () => {
  console.log("Database connected successfully");
});

// Log any database connection errors
pool.on("error", (err) => {
  console.error("Database connection error:", err);
});

// Helper function to run database queries with error handling
const query = async (text, params) => {
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

module.exports = { query, pool };