const mongoose = require("mongoose");

const pendingUserSchema = new mongoose.Schema(
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
    verificationCode: {
      type: String,
      required: true,
    },

    verificationCodeExpiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);
pendingUserSchema.index(
  { email: 1, role: 1 },
  { unique: true },
);


const PendingUser = mongoose.model("PendingUser", pendingUserSchema);

module.exports = PendingUser;
