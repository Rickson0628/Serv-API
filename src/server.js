require("dotenv").config();

const express = require("express");
const connectDB = require("./config/db");

// Route imports
const providerRoutes = require("./routes/providerRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();
const PORT = 5000;

app.use(express.json());

// API routes
app.use("/api/providers", providerRoutes);
app.use("/api/auth", authRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("Hello World");
});

// Server start
async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log("Listening to port", PORT);
    });
  } catch (error) {
    console.error("Server failed to start");
  }
}

startServer();