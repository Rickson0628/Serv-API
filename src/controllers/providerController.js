const ProviderProfile = require("../models/ProviderProfile");

async function createProviderProfile(req, res) {
  try {
    const userId = req.user.id;

    const {
      bio,
      services,
      baseLocation,
      travelDistance,
      yearsOfExperience,
    } = req.body;

    const existingProfile = await ProviderProfile.findOne({
      user: userId,
    });

    if (existingProfile) {
      return res.status(409).json({
        message: "Provider profile already exists",
      });
    }

    const savedProfile = await ProviderProfile.create({
      user: userId,
      bio,
      services,
      baseLocation,
      travelDistance,
      yearsOfExperience,
    });

    return res.status(201).json({
      message: "Provider profile created successfully",
      profile: savedProfile,
    });
  } catch (error) {
    console.error("Error creating provider profile:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Invalid provider profile data",
      });
    }

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

module.exports = createProviderProfile;