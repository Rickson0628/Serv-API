require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const providerRoutes = require("./routes/providerRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();


app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://serv-services.vercel.app",
    ],
      credentials: true,
  }),
);
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("MongoDB connection failed:", error);

    res.status(503).json({
      message: "Database temporarily unavailable.",
    });
  }
});
app.use("/api/providers", providerRoutes);
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Hello World");
});

module.exports = app;