require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");

// Routes Imports
const providerRoutes = require("./routes/providerRoutes");

const app = express();
const PORT = 5000;
app.use(express.json());

// Provider API routes
app.use("/api/providers", providerRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("Hello World");
});


// Server Start
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