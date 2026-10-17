const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  createProviderProfile,
  getProviderProfile,
  updateProviderProfile,
  deleteProviderService,
} = require("../controllers/providerController");

router.post("/provider-profile", authMiddleware, createProviderProfile);
router.get("/provider-profile", authMiddleware, getProviderProfile);
router.patch("/provider-profile", authMiddleware, updateProviderProfile);
router.delete("/provider-profile/services/:type", authMiddleware, deleteProviderService);

module.exports = router;