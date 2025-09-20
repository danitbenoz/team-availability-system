const express = require("express");
const authenticateToken = require("../middleware/authenticateToken");
const { query } = require("../config/database");

const router = express.Router();

// Get all users and their current status

router.get("/", async (req, res) => {
  try {
    // Get all users with their status info for the dashboard
    const result = await query(`
      SELECT u.id, u.username, u.full_name, u.email,
             s.name as current_status, s.id as status_id,
             u.created_at, u.updated_at
      FROM users u
      LEFT JOIN statuses s ON u.current_status_id = s.id
      ORDER BY u.id ASC
    `);

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

// Get current logged-in user's profile (requires login)
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id; // This comes from the auth middleware

    // Get the current user's full profile
    const result = await query(
      `SELECT u.id, u.username, u.full_name, u.email,
             s.name as current_status, s.id as status_id,
             u.created_at, u.updated_at
      FROM users u
      LEFT JOIN statuses s ON u.current_status_id = s.id
      WHERE u.id = $1`,
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

// Let user update their own status (requires login)
router.put("/me/status", authenticateToken, async (req, res) => {
  try {
    let { statusId } = req.body;
    const userId = req.user.id; // From auth middleware

    statusId = Number(statusId);
    if (!statusId) {
      return res.status(400).json({
        success: false,
        error: "Status ID is required",
      });
    }

    const statusCheck = await query(
      "SELECT id, name FROM statuses WHERE id = $1",
      [statusId]
    );

    if (statusCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid status ID",
      });
    }

    // Update the user's status in the database
    const result = await query(
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

// Admin endpoint to update any user's status (no auth required for now)
router.put("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { statusId } = req.body;

    if (!statusId) {
      return res.status(400).json({
        success: false,
        error: "Status ID is required",
      });
    }

    const statusCheck = await query(
      "SELECT id, name FROM statuses WHERE id = $1",
      [statusId]
    );

    if (statusCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid status ID",
      });
    }

    const result = await query(
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

module.exports = router;