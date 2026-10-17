require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log("Listening to port", PORT);
    });
  } catch (error) {
    console.error("Server failed to start", error);
  }
}

startServer();