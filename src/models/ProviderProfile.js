const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "Auto Body",
        "Auto Windshield",
        "Auto Mechanic",
        "Auto Detailing",
      ],
      required: true,
    },

    workPhotos: {
      type: [String],
      default: [],
    },

    licensePhotos: {
      type: [String],
      default: [],
    },

    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  {
    _id: false,
  },
);

const providerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    bio: {
      type: String,
      trim: true,
      default: "",
    },

    services: {
      type: [serviceSchema],
      default: [],
    },

    baseLocation: {
      type: String,
      trim: true,
      default: "",
    },

    travelDistance: {
      type: Number,
      default: 0,
    },

    yearsOfExperience: {
      type: Number,
      default: 0,
    },

    averageRating: {
      type: Number,
      default: 0,
    },

    reviewCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

const ProviderProfile = mongoose.model(
  "ProviderProfile",
  providerProfileSchema,
);

module.exports = ProviderProfile;