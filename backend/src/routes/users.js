const express = require('express');
const { body, validationResult, query } = require('express-validator');
const db = require('../config/database');

const router = express.Router();

// Get all users with their current status
router.get('/', [
  query('status').optional().isString().withMessage('Status filter must be a string')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { status } = req.query;
    
    let queryText = `
      SELECT 
        u.id, 
        u.username, 
        u.full_name, 
        u.email,
        s.name as current_status,
        s.id as status_id,
        u.updated_at as last_updated
      FROM users u 
      LEFT JOIN statuses s ON u.current_status_id = s.id
    `;
    
    const queryParams = [];
    
    if (status) {
      queryText += ' WHERE s.name = $1';
      queryParams.push(status);
    }
    
    queryText += ' ORDER BY u.full_name ASC';

    const result = await db.query(queryText, queryParams);

    const users = result.rows.map(user => ({
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      email: user.email,
      currentStatus: user.current_status || 'Working',
      statusId: user.status_id,
      lastUpdated: user.last_updated
    }));

    res.json({
      users,
      total: users.length,
      filteredBy: status || null
    });

  } catch (error) {
    next(error);
  }
});

// Get current user profile

// Get current user profile (Protected route)
// router.get('/me',authenticateToken ,async (req, res, next) => {
//   try {
//     const userId = req.user.id; // User info is now available in req.user from the middleware

//     const result = await db.query(
//       `SELECT 
//         u.id, 
//         u.username, 
//         u.full_name, 
//         u.email,
//         s.name as current_status,
//         s.id as status_id,
//         u.created_at,
//         u.updated_at
//       FROM users u 
//       LEFT JOIN statuses s ON u.current_status_id = s.id 
//       WHERE u.id = $1`,
//       [userId]
//     );

//     if (result.rows.length === 0) {
//       return res.status(404).json({
//         error: 'User not found',
//         code: 'USER_NOT_FOUND'
//       });
//     }

//     const user = result.rows[0];
//     res.json({
//       id: user.id,
//       username: user.username,
//       fullName: user.full_name,
//       email: user.email,
//       currentStatus: user.current_status || 'Working',
//       statusId: user.status_id,
//       createdAt: user.created_at,
//       updatedAt: user.updated_at
//     });

//   } catch (error) {
//     next(error);
//   }
// });
app.get('/api/users/me', async (req, res) => {
  try {
    const user = req.user;  // The user should be available after authentication

    res.json({
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      email: user.email,
      currentStatus: user.current_status || 'Working',
      statusId: user.status_id,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user data',
      message: error.message
    });
  }
});


// Update current user's status
router.put('/me/status', [
  body('statusId')
    .isInt({ min: 1 })
    .withMessage('Valid status ID is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const userId = req.user.id;
    const { statusId } = req.body;

    // Verify status exists
    const statusResult = await db.query(
      'SELECT id, name FROM statuses WHERE id = $1',
      [statusId]
    );

    if (statusResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Invalid status ID',
        code: 'INVALID_STATUS'
      });
    }

    // Update user's status
    const updateResult = await db.query(
      `UPDATE users 
       SET current_status_id = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING id, username, full_name`,
      [statusId, userId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const status = statusResult.rows[0];
    const user = updateResult.rows[0];

    res.json({
      success: true,
      message: `Status updated to "${status.name}"`,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        currentStatus: status.name,
        statusId: status.id
      }
    });

  } catch (error) {
    next(error);
  }
});

// Get user by ID (for admin purposes)
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isNaN(parseInt(id))) {
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_ID'
      });
    }

    const result = await db.query(
      `SELECT 
        u.id, 
        u.username, 
        u.full_name, 
        u.email,
        s.name as current_status,
        s.id as status_id,
        u.created_at,
        u.updated_at
      FROM users u 
      LEFT JOIN statuses s ON u.current_status_id = s.id 
      WHERE u.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      email: user.email,
      currentStatus: user.current_status || 'Working',
      statusId: user.status_id,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;