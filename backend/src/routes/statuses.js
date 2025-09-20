const express = require("express");
const { query } = require("../config/database");

const router = express.Router();

// Get all available status options (Working, On Vacation, etc.)
router.get("/", async (req, res) => {
  try {
    // Fetch all status types from database
    const result = await query(
      "SELECT id, name, created_at FROM statuses ORDER BY id ASC"
    );

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

module.exports = router;