const ProviderProfile = require("../models/ProviderProfile");

// Create provider profile
async function createProviderProfile(req, res) {
  try {
    const userId = req.user.id;

    if (req.user.role !== "provider") {
      return res.status(403).json({
        message: "Only providers can create a provider profile",
      });
    }

    const existingProfile = await ProviderProfile.findOne({
      user: userId,
    });

    if (existingProfile) {
      return res.status(409).json({
        message: "Provider profile already exists",
      });
    }

    const {
      bio,
      services,
      baseLocation,
      travelDistance,
      yearsOfExperience,
    } = req.body;

    // Only allow provider-editable service fields
    const safeServices = (services || []).map((service) => ({
      type: service.type,
      workPhotos: service.workPhotos || [],
      licensePhotos: service.licensePhotos || [],
    }));

    const savedProfile = await ProviderProfile.create({
      user: userId,
      bio,
      services: safeServices,
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

// Get current provider profile
async function getProviderProfile(req, res) {
  try {
    const userId = req.user.id;

    if (req.user.role !== "provider") {
      return res.status(403).json({
        message: "Only providers can access a provider profile",
      });
    }

    const profile = await ProviderProfile.findOne({
      user: userId,
    });

    if (!profile) {
      return res.status(404).json({
        message: "Provider profile not found",
      });
    }

    return res.status(200).json({
      profile,
    });
  } catch (error) {
    console.error("Error getting provider profile:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

// Update provider profile
async function updateProviderProfile(req, res) {
  try {
    const userId = req.user.id;

    if (req.user.role !== "provider") {
      return res.status(403).json({
        message: "Only providers can update a provider profile",
      });
    }

    const {
      bio,
      services,
      baseLocation,
      travelDistance,
      yearsOfExperience,
    } = req.body;

    const profile = await ProviderProfile.findOne({
      user: userId,
    });

    if (!profile) {
      return res.status(404).json({
        message: "Provider profile not found",
      });
    }

    // Update only fields that were provided
    if (bio !== undefined) {
      profile.bio = bio;
    }

    if (baseLocation !== undefined) {
      profile.baseLocation = baseLocation;
    }

    if (travelDistance !== undefined) {
      profile.travelDistance = travelDistance;
    }

    if (yearsOfExperience !== undefined) {
      profile.yearsOfExperience = yearsOfExperience;
    }

    // Update existing services or add new services
    // without removing services that were not sent
    if (services !== undefined) {
      services.forEach((service) => {
        const existingService = profile.services.find(
          (currentService) =>
            currentService.type === service.type,
        );

        if (existingService) {
          if (service.workPhotos !== undefined) {
            existingService.workPhotos =
              service.workPhotos;
          }

          if (service.licensePhotos !== undefined) {
            existingService.licensePhotos =
              service.licensePhotos;
          }
        } else {
          profile.services.push({
            type: service.type,
            workPhotos: service.workPhotos || [],
            licensePhotos: service.licensePhotos || [],
            approvalStatus: "pending",
          });
        }
      });
    }

    await profile.save();

    return res.status(200).json({
      message: "Provider profile updated successfully",
      profile,
    });
  } catch (error) {
    console.error(
      "Error updating provider profile:",
      error,
    );

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

// Delete one service from provider profile
async function deleteProviderService(req, res) {
  try {
    const userId = req.user.id;
    const { type } = req.params;

    if (req.user.role !== "provider") {
      return res.status(403).json({
        message:
          "Only providers can delete a provider service",
      });
    }

    const profile = await ProviderProfile.findOne({
      user: userId,
    });

    if (!profile) {
      return res.status(404).json({
        message: "Provider profile not found",
      });
    }

    const existingService = profile.services.find(
      (service) => service.type === type,
    );

    if (!existingService) {
      return res.status(404).json({
        message: "Service not found",
      });
    }

    profile.services = profile.services.filter(
      (service) => service.type !== type,
    );

    await profile.save();

    return res.status(200).json({
      message: "Service deleted successfully",
      profile,
    });
  } catch (error) {
    console.error(
      "Error deleting provider service:",
      error,
    );

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

module.exports = {
  createProviderProfile,
  getProviderProfile,
  updateProviderProfile,
  deleteProviderService,
};