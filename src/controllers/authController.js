
require("dotenv").config();

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("node:crypto");

const User = require("../models/User");
const PendingUser = require("../models/PendingUser");
const sendEmail = require("../utils/sendEmail");

const CURRENT_TERMS_VERSION = "1.0";
const RESET_CODE_TTL_MS = 10 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000;
const MAX_RESET_CODE_ATTEMPTS = 5;

const resetCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

// Generate a cryptographically secure 6-digit code
function generateSixDigitCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

// Hash a password reset code using a secret key
function hashResetCode(userId, code) {
  return crypto
    .createHmac("sha256", process.env.RESET_CODE_SECRET)
    .update(`${userId}:${code}`)
    .digest("hex");
}

// Hash a random reset token
function hashResetToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

// Issue a new password reset code
async function issuePasswordResetCode(user) {
  const code = generateSixDigitCode();

  user.passwordResetCodeHash = hashResetCode(user._id, code);

  user.passwordResetExpiresAt = new Date(
    Date.now() + RESET_CODE_TTL_MS
  );

  user.passwordResetAttempts = 0;

  // Invalidate previous reset authorization
  user.passwordResetTokenHash = null;
  user.passwordResetTokenExpiresAt = null;

  await user.save();

  return code;
}

// ======================================================
// SIGNUP
// ======================================================

// Start signup and send verification code
async function startSignup(req, res) {
  try {
    const { firstName, lastName, email, password, role, agreeToTerms } = req.body;

    if (agreeToTerms !== true) {
      return res.status(400).json({
        message: "You must agree to the Terms of Service.",
      });
    }

    if (!["customer", "provider"].includes(role)) {
      return res.status(400).json({
        message: "Invalid account type.",
      });
    }

    const existingUser = await User.findOne({
      email,
      role,
    });

    if (existingUser) {
      return res.status(409).json({
        message: `A ${role} account with this email already exists. Please log in instead.`,
      });
    }

    const hashPassword = await bcrypt.hash(password, 12);

    const verificationCode = generateSixDigitCode();

    const verificationCodeExpiresAt = new Date(
      Date.now() + 10 * 60 * 1000
    );

    const existingPendingUser = await PendingUser.findOne({
      email,
      role,
    });

    if (existingPendingUser) {
      existingPendingUser.firstName = firstName;
      existingPendingUser.lastName = lastName;
      existingPendingUser.password = hashPassword;
      existingPendingUser.role = role;
      existingPendingUser.verificationCode = verificationCode;
      existingPendingUser.verificationCodeExpiresAt =
        verificationCodeExpiresAt;
      existingPendingUser.termsVersion= CURRENT_TERMS_VERSION;
      existingPendingUser.termsAcceptedAt= new Date();

      await existingPendingUser.save();
    } else {
      await PendingUser.create({
        firstName,
        lastName,
        email,
        password: hashPassword,
        role,
        termsVersion: CURRENT_TERMS_VERSION,
        termsAcceptedAt: new Date(),
        verificationCode,
        verificationCodeExpiresAt,

      });
    }

    const info = await sendEmail(
      email,
      "Verify Your Serv Email",
      `Your Serv verification code is ${verificationCode}. This code will expire in 10 minutes.`,
      `
        <h2>Verify Your Email</h2>

        <p>Thank you for signing up for Serv.</p>

        <p>Your verification code is:</p>

        <h1>${verificationCode}</h1>

        <p>This code will expire in 10 minutes.</p>

        <p>If you did not create a Serv account, you can ignore this email.</p>

        <p>Thank you,<br>Serv Team</p>
      `
    );

    if (info.accepted && info.accepted.length > 0) {
      return res.status(200).json({
        message: "Verification code sent successfully.",
      });
    }

    return res.status(500).json({
      message: "Unable to send verification email.",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
}

// ======================================================
// VERIFY SIGNUP EMAIL
// ======================================================

async function verifySignupEmail(req, res) {
  try {
    const { email, role, verificationCode } = req.body;

    if (!["customer", "provider"].includes(role)) {
      return res.status(400).json({
        message: "Invalid account type.",
      });
    }

    const pendingUser = await PendingUser.findOne({
      email,
      role,
    });

    if (!pendingUser) {
      return res.status(400).json({
        message: "Invalid verification request.",
      });
    }

    if (pendingUser.verificationCode !== verificationCode) {
      return res.status(401).json({
        message: "Invalid verification code.",
      });
    }

    if (pendingUser.verificationCodeExpiresAt < new Date()) {
      return res.status(400).json({
        message:
          "Verification code has expired. Please request a new code.",
      });
    }

    const newUser = await User.create({
      firstName: pendingUser.firstName,
      lastName: pendingUser.lastName,
      email: pendingUser.email,
      password: pendingUser.password,
      role: pendingUser.role,
      isVerified: true,
      termsVersion: pendingUser.termsVersion,
      termsAcceptedAt: pendingUser.termsAcceptedAt
    });

    await PendingUser.deleteOne({
      _id: pendingUser._id,
    });

    const payload = {
      id: newUser._id,
      role: newUser.role,
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    res.cookie("sessionToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24,
      path: "/",
    });

    return res.status(201).json({
      message: "Account created successfully.",
      user: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: newUser.role,
        isVerified: newUser.isVerified,
      },
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
}

// ======================================================
// RESEND SIGNUP VERIFICATION CODE
// ======================================================

async function resendSignupVerificationCode(req, res) {
  try {
    const { email, role } = req.body;

    if (!["customer", "provider"].includes(role)) {
      return res.status(400).json({
        message: "Invalid account type.",
      });
    }

    const pendingUser = await PendingUser.findOne({
      email,
      role,
    });

    if (!pendingUser) {
      return res.status(200).json({
        message:
          "If a pending signup exists for that email, a new verification code has been sent.",
      });
    }

    const verificationCode = generateSixDigitCode();

    const verificationCodeExpiresAt = new Date(
      Date.now() + 10 * 60 * 1000
    );

    pendingUser.verificationCode = verificationCode;
    pendingUser.verificationCodeExpiresAt =
      verificationCodeExpiresAt;

    await pendingUser.save();

    const info = await sendEmail(
      email,
      "Your New Serv Verification Code",
      `Your new Serv verification code is ${verificationCode}. This code will expire in 10 minutes.`,
      `
        <h2>Verify Your Email</h2>

        <p>You requested a new verification code for your Serv account.</p>

        <p>Your new verification code is:</p>

        <h1>${verificationCode}</h1>

        <p>This code will expire in 10 minutes.</p>

        <p>If you did not request a new verification code, you can ignore this email.</p>

        <p>Thank you,<br>Serv Team</p>
      `
    );

    if (info.accepted && info.accepted.length > 0) {
      return res.status(200).json({
        message:
          "If a pending signup exists for that email, a new verification code has been sent.",
      });
    }

    return res.status(500).json({
      message: "Unable to send verification email.",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
}

// ======================================================
// LOGIN
// ======================================================

async function login(req, res) {
  try {
    const { email, password, role } = req.body;

    if (!["customer", "provider"].includes(role)) {
      return res.status(400).json({
        message: "Invalid account type.",
      });
    }

    const currentUser = await User.findOne({
      email,
      role,
    });

    if (!currentUser) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      currentUser.password
    );

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const payload = {
      id: currentUser._id,
      role: currentUser.role,
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    res.cookie("sessionToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24,
      path: "/",
    });

    return res.status(200).json({
      message: "User successfully logged in.",
      user: {
        id: currentUser._id,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        email: currentUser.email,
        role: currentUser.role,
        isVerified: currentUser.isVerified,
      },
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
}

// ======================================================
// FORGOT PASSWORD
// ======================================================

async function forgotPassword(req, res) {
  try {
    const { email, role } = req.body;

    if (
      typeof email !== "string" ||
      !email.trim() ||
      !["customer", "provider"].includes(role)
    ) {
      return res.status(400).json({
        message: "Invalid reset request.",
      });
    }

    const successMessage =
      "If an account exists with that email, a password reset code has been sent.";

    const existingUser = await User.findOne({
      email,
      role,
    });

    if (!existingUser) {
      return res.status(200).json({
        message: successMessage,
      });
    }

    const passwordResetCode = await issuePasswordResetCode(
      existingUser
    );

    const info = await sendEmail(
      email,
      "Reset Your Serv Password",
      `Your Serv password reset code is ${passwordResetCode}. This code will expire in 10 minutes.`,
      `
        <h2>Reset Your Password</h2>

        <p>Your password reset code is:</p>

        <h1>${passwordResetCode}</h1>

        <p>This code will expire in 10 minutes.</p>

        <p>If you did not request a password reset, you can ignore this email.</p>

        <p>Thank you,<br>Serv Team</p>
      `
    );

    if (info.accepted && info.accepted.length > 0) {
      return res.status(200).json({
        message: successMessage,
      });
    }

    return res.status(500).json({
      message: "Unable to send password reset email.",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
}

// ======================================================
// VERIFY PASSWORD RESET CODE
// ======================================================

async function verifyPasswordResetCode(req, res) {
  try {
    const { email, role, code } = req.body;

    if (
      typeof email !== "string" ||
      !email.trim() ||
      !["customer", "provider"].includes(role) ||
      typeof code !== "string" ||
      !/^\d{6}$/.test(code)
    ) {
      return res.status(400).json({
        message: "Invalid verification request.",
      });
    }

    const user = await User.findOne({
      email,
      role,
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired verification code.",
      });
    }

    // Generate temporary reset authorization
    const resetToken = crypto
      .randomBytes(32)
      .toString("hex");

    // Verify and consume the code atomically
    const verifiedUser = await User.findOneAndUpdate(
      {
        _id: user._id,
        passwordResetCodeHash: hashResetCode(
          user._id,
          code
        ),
        passwordResetExpiresAt: {
          $gt: new Date(),
        },
        passwordResetAttempts: {
          $lt: MAX_RESET_CODE_ATTEMPTS,
        },
      },
      {
        $set: {
          passwordResetTokenHash:
            hashResetToken(resetToken),

          passwordResetTokenExpiresAt: new Date(
            Date.now() + RESET_TOKEN_TTL_MS
          ),
        },
        $unset: {
          passwordResetCodeHash: "",
          passwordResetExpiresAt: "",
        },
      }
    );

    if (!verifiedUser) {
      // Count incorrect verification attempts
      await User.updateOne(
        {
          _id: user._id,
          passwordResetCodeHash: {
            $exists: true,
            $ne: null,
          },
          passwordResetExpiresAt: {
            $gt: new Date(),
          },
          passwordResetAttempts: {
            $lt: MAX_RESET_CODE_ATTEMPTS,
          },
        },
        {
          $inc: {
            passwordResetAttempts: 1,
          },
        }
      );

      return res.status(400).json({
        message: "Invalid or expired verification code.",
      });
    }

    // Set separate password-reset cookie
    res.cookie("resetToken", resetToken, {
      ...resetCookieOptions,
      maxAge: RESET_TOKEN_TTL_MS,
    });

    return res.status(200).json({
      message: "Password reset code verified successfully.",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
}

// ======================================================
// RESEND PASSWORD RESET CODE
// ======================================================

async function resendPasswordResetCode(req, res) {
  try {
    const { email, role } = req.body;

    if (
      typeof email !== "string" ||
      !email.trim() ||
      !["customer", "provider"].includes(role)
    ) {
      return res.status(400).json({
        message: "Invalid reset request.",
      });
    }

    const successMessage =
      "If an account exists with that email, a new password reset code has been sent.";

    const user = await User.findOne({
      email,
      role,
    });

    if (!user) {
      return res.status(200).json({
        message: successMessage,
      });
    }

    const passwordResetCode = await issuePasswordResetCode(
      user
    );

    const info = await sendEmail(
      email,
      "Your New Serv Password Reset Code",
      `Your new Serv password reset code is ${passwordResetCode}. This code will expire in 10 minutes.`,
      `
        <h2>Reset Your Password</h2>

        <p>You requested a new password reset code for your Serv account.</p>

        <p>Your new reset code is:</p>

        <h1>${passwordResetCode}</h1>

        <p>This code will expire in 10 minutes.</p>

        <p>If you did not request this, you can ignore this email.</p>

        <p>Thank you,<br>Serv Team</p>
      `
    );

    if (info.accepted && info.accepted.length > 0) {
      return res.status(200).json({
        message: successMessage,
      });
    }

    return res.status(500).json({
      message: "Unable to send verification email.",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
}

// ======================================================
// RESET PASSWORD
// ======================================================

async function resetPassword(req, res) {
  try {
    const { newPassword } = req.body;

    const resetToken = req.cookies?.resetToken;

    if (
      typeof resetToken !== "string" ||
      !/^[a-f0-9]{64}$/.test(resetToken)
    ) {
      return res.status(401).json({
        message: "Password reset authorization required.",
      });
    }

    if (
      typeof newPassword !== "string" ||
      newPassword.length < 8
    ) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters.",
      });
    }

    const tokenHash = hashResetToken(resetToken);

    const resetUser = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetTokenExpiresAt: {
        $gt: new Date(),
      },
    });

    if (!resetUser) {
      return res.status(401).json({
        message: "Invalid or expired reset token.",
      });
    }

    const hashedPassword = await bcrypt.hash(
      newPassword,
      12
    );

    // Atomically change password and consume reset token
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: resetUser._id,
        passwordResetTokenHash: tokenHash,
        passwordResetTokenExpiresAt: {
          $gt: new Date(),
        },
      },
      {
        $set: {
          password: hashedPassword,
        },
        $unset: {
          passwordResetTokenHash: "",
          passwordResetTokenExpiresAt: "",
          passwordResetCodeHash: "",
          passwordResetExpiresAt: "",
        },
      }
    );

    if (!updatedUser) {
      return res.status(401).json({
        message: "Invalid or expired reset token.",
      });
    }

    // Remove temporary reset cookie
    res.clearCookie("resetToken", resetCookieOptions);

    return res.status(200).json({
      message: "Password changed successfully.",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
}

// ======================================================
// GET CURRENT LOGGED-IN USER
// ======================================================

async function getCurrentUser(req, res) {
  try {
    const user = await User.findById(
      req.user.id
    ).select(
      "-password " +
      "-passwordResetCode " +
      "-passwordResetVerified " +
      "-passwordResetCodeHash " +
      "-passwordResetExpiresAt " +
      "-passwordResetAttempts " +
      "-passwordResetTokenHash " +
      "-passwordResetTokenExpiresAt"
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    return res.status(200).json({
      user,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
}

// ======================================================
// LOG OUT
// ======================================================

async function logout(req,res){
   res.clearCookie("sessionToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

   return res.status(200).json({
    message: "Logged out successfully.",
  });

}


// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  startSignup,
  verifySignupEmail,
  resendSignupVerificationCode,
  login,
  forgotPassword,
  verifyPasswordResetCode,
  resendPasswordResetCode,
  resetPassword,
  getCurrentUser,
  logout,
};
