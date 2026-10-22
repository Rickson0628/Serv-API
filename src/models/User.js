const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["customer", "provider"],
      required: true,
    },
    profilePicture: {
      type: String,
      default: "",
    },
    phoneNumber: {
      type: String,
      default: "",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    passwordResetCode: {
      type: String,
      default: "",
    },

   passwordResetCodeHash: {
  type: String,
  default: null,
},
passwordResetExpiresAt: {
  type: Date,
  default: null,
},
passwordResetAttempts: {
  type: Number,
  default: 0,
},
passwordResetTokenHash: {
  type: String,
  default: null,
},
passwordResetTokenExpiresAt: {
  type: Date,
  default: null,
},
  },
  {
    timestamps: true,
  },
);

userSchema.index(
  { email: 1, role: 1 },
  { unique: true },
);

const User = mongoose.model("User", userSchema);

module.exports = User;
