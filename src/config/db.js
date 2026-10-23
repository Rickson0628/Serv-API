const mongoose = require("mongoose");

let connectionPromise = null;

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (!process.env.MONGODB_URL) {
    throw new Error("MONGODB_URL is missing");
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(process.env.MONGODB_URL)
      .then(() => {
        console.log("MongoDB connected successfully");
      })
      .catch((error) => {
        connectionPromise = null;
        throw error;
      });
  }

  await connectionPromise;
}

module.exports = connectDB;