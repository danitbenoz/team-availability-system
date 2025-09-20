const express = require('express');
const db = require('../config/database');

const router = express.Router();

// Get all available statuses
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT id, name, created_at FROM statuses ORDER BY id ASC'
    );

    const statuses = result.rows.map(status => ({
      id: status.id,
      name: status.name,
      createdAt: status.created_at
    }));

    res.json({
      statuses,
      total: statuses.length
    });

  } catch (error) {
    next(error);
  }
});

// Get status by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isNaN(parseInt(id))) {
      return res.status(400).json({
        error: 'Invalid status ID',
        code: 'INVALID_ID'
      });
    }

    const result = await db.query(
      'SELECT id, name, created_at FROM statuses WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Status not found',
        code: 'STATUS_NOT_FOUND'
      });
    }

    const status = result.rows[0];
    res.json({
      id: status.id,
      name: status.name,
      createdAt: status.created_at
    });

  } catch (error) {
    next(error);
  }
});

// Get users count by status
router.get('/:id/users/count', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isNaN(parseInt(id))) {
      return res.status(400).json({
        error: 'Invalid status ID',
        code: 'INVALID_ID'
      });
    }

    // Verify status exists
    const statusResult = await db.query(
      'SELECT id, name FROM statuses WHERE id = $1',
      [id]
    );

    if (statusResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Status not found',
        code: 'STATUS_NOT_FOUND'
      });
    }

    // Count users with this status
    const countResult = await db.query(
      'SELECT COUNT(*) as count FROM users WHERE current_status_id = $1',
      [id]
    );

    const status = statusResult.rows[0];
    const count = parseInt(countResult.rows[0].count);

    res.json({
      status: {
        id: status.id,
        name: status.name
      },
      userCount: count
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;