const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  const token = req.cookies?.sessionToken;

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized. No token provided.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      message: "Invalid or expired token.",
    });
  }
}

module.exports = authMiddleware;