require("dotenv").config();

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const PendingUser = require("../models/PendingUser");

const sendEmail = require("../utils/sendEmail");

// Start signup and send verification code
async function startSignup(req, res) {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    if (!["customer", "provider"].includes(role)) {
      return res.status(400).json({
        message: "Invalid account type.",
      });
    }

    const existingUser = await User.findOne({ email, role });

    if (existingUser) {
      return res.status(409).json({
        message: `A ${role} account with this email already exists. Please log in instead.`,
      });
    }

    const costFactor = 12;
    const hashPassword = await bcrypt.hash(password, costFactor);

    // Generate 6-digit verification code
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();

    const verificationCodeExpiresAt = new Date(
      Date.now() + 600000, // 10 minutes
    );

    const existingPendingUser = await PendingUser.findOne({
      email,
      role,
    });

    // Update existing pending signup instead of creating duplicates
    if (existingPendingUser) {
      existingPendingUser.firstName = firstName;
      existingPendingUser.lastName = lastName;
      existingPendingUser.password = hashPassword;
      existingPendingUser.role = role;
      existingPendingUser.verificationCode = verificationCode;
      existingPendingUser.verificationCodeExpiresAt =
        verificationCodeExpiresAt;

      await existingPendingUser.save();
    } else {
      await PendingUser.create({
        firstName,
        lastName,
        email,
        password: hashPassword,
        role,
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
      `,
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

// Verify signup email and create actual user
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
    });

    await PendingUser.deleteOne({
      _id: pendingUser._id,
    });

    const payload = {
      id: newUser._id,
      role: newUser.role,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1d",
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
      token,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
}

// Resend signup verification code
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

    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();

    const verificationCodeExpiresAt = new Date(
      Date.now() + 600000,
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
      `,
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

// Login user
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
      currentUser.password,
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

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1d",
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
      token,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
}

// Send password reset code
async function forgotPassword(req, res) {
  try {
    const { email, role } = req.body;

    if (!["customer", "provider"].includes(role)) {
      return res.status(400).json({
        message: "Invalid account type.",
      });
    }

    const existingUser = await User.findOne({
      email,
      role,
    });

    if (!existingUser) {
      return res.status(200).json({
        message:
          "If an account exists with that email, a password reset code has been sent.",
      });
    }

    const passwordResetCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();

    const passwordResetExpiresAt = new Date(
      Date.now() + 600000,
    );

    existingUser.passwordResetCode = passwordResetCode;
    existingUser.passwordResetExpiresAt =
      passwordResetExpiresAt;
    existingUser.passwordResetVerified = false;

    await existingUser.save();

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
      `,
    );

    if (info.accepted && info.accepted.length > 0) {
      return res.status(200).json({
        message:
          "If an account exists with that email, a password reset code has been sent.",
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

// Verify password reset code
async function verifyPasswordResetCode(req, res) {
  try {
    const { email, role, code } = req.body;

    if (!["customer", "provider"].includes(role)) {
      return res.status(400).json({
        message: "Invalid account type.",
      });
    }

    const existingUser = await User.findOne({
      email,
      role,
    });

    if (!existingUser) {
      return res.status(400).json({
        message: "Invalid verification request.",
      });
    }

    if (existingUser.passwordResetCode !== code) {
      return res.status(401).json({
        message: "Invalid verification code.",
      });
    }

    if (existingUser.passwordResetExpiresAt < new Date()) {
      return res.status(400).json({
        message:
          "Verification code has expired. Please request a new code.",
      });
    }

    existingUser.passwordResetVerified = true;

    await existingUser.save();

    return res.status(200).json({
      message: "Password reset code verified successfully.",
      email,
      role,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
}

// Resend password reset code
async function resendPasswordResetCode(req, res) {
  try {
    const { email, role } = req.body;

    if (!["customer", "provider"].includes(role)) {
      return res.status(400).json({
        message: "Invalid account type.",
      });
    }

    const user = await User.findOne({
      email,
      role,
    });

    if (!user) {
      return res.status(200).json({
        message:
          "If an account exists with that email, a new password reset code has been sent.",
      });
    }

    const passwordResetCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();

    const passwordResetExpiresAt = new Date(
      Date.now() + 600000,
    );

    user.passwordResetCode = passwordResetCode;
    user.passwordResetExpiresAt =
      passwordResetExpiresAt;
    user.passwordResetVerified = false;

    await user.save();

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
      `,
    );

    if (info.accepted && info.accepted.length > 0) {
      return res.status(200).json({
        message:
          "If an account exists with that email, a new password reset code has been sent.",
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

// Reset password after successful verification
async function resetPassword(req, res) {
  try {
    const { email, role, newPassword } = req.body;

    if (!["customer", "provider"].includes(role)) {
      return res.status(400).json({
        message: "Invalid account type.",
      });
    }

    const user = await User.findOne({
      email,
      role,
    });

    if (!user) {
      return res.status(400).json({
        message: "Password reset verification is required.",
      });
    }

    if (!user.passwordResetVerified) {
      return res.status(400).json({
        message: "Password reset verification is required.",
      });
    }

    if (user.passwordResetExpiresAt < new Date()) {
      return res.status(400).json({
        message:
          "Password reset session has expired. Please request a new code.",
      });
    }

    const hashPassword = await bcrypt.hash(
      newPassword,
      12,
    );

    user.password = hashPassword;

    // Clear password reset information
    user.passwordResetCode = "";
    user.passwordResetExpiresAt = null;
    user.passwordResetVerified = false;

    await user.save();

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

// Get current logged-in user
async function getCurrentUser(req, res) {
  try {
    const user = await User.findById(req.user.id).select(
      "-password -passwordResetCode -passwordResetExpiresAt -passwordResetVerified",
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
};