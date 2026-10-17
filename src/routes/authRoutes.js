const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  startSignup,
  verifySignupEmail,
  resendSignupVerificationCode,
  login,
  forgotPassword,
  verifyPasswordResetCode,
  resendPasswordResetCode,
  resetPassword,
  getCurrentUser,
} = require("../controllers/authController");

// Signup
router.post("/signup", startSignup);
router.post("/verify-email", verifySignupEmail);
router.post("/resend-verification", resendSignupVerificationCode);

// Login
router.post("/login", login);

// Password reset
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-code", verifyPasswordResetCode);
router.post("/resend-reset-code", resendPasswordResetCode);
router.patch("/reset-password", resetPassword);

// Get current logged-in user
router.get("/me", authMiddleware, getCurrentUser);

module.exports = router;