const jwt = require("jsonwebtoken");
const { query } = require("../config/database");

// Middleware to check if user is logged in with a valid token
const authenticateToken = async (req, res, next) => {
  // Extract token from Authorization header (format: "Bearer <token>")
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  // No token provided - user needs to login
  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Access token required",
      code: "NO_TOKEN",
    });
  }

  try {
    // Verify the token is valid and not expired
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Make sure the user still exists in database
    const userResult = await query(
      "SELECT id, username, email, full_name FROM users WHERE id = $1",
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    // Add user info to request so other routes can use it
    req.user = userResult.rows[0];
    next(); // Continue to the actual route
  } catch (error) {
    console.error("Token verification error:", error);

    // Handle expired tokens specifically
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: "Token expired",
        code: "TOKEN_EXPIRED",
      });
    }

    // Invalid or corrupted token
    return res.status(403).json({
      success: false,
      error: "Invalid token",
      code: "INVALID_TOKEN",
    });
  }
};

module.exports = authenticateToken;
