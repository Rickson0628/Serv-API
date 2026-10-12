require("dotenv").config();

const express = require("express");
const connectDB = require("./config/db");

const app = express();
const PORT = 5000;

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World");
});

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