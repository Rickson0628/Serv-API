  const mongoose = require("mongoose");

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

      providerType: {
        type: String,
        enum: [
          "Auto Body",
          "Auto Windshield",
          "Auto Mechanic",
          "Auto Detailing",
        ],
      },

      workPhotos: {
        type: [String],
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

      approvalStatus: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
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