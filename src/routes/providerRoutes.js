const express = require("express");
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware')

const createProviderProfile = require("../controllers/providerController");

router.post("/provider-profile", authMiddleware ,createProviderProfile);


module.exports = router;