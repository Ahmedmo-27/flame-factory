const connectMongo = require("./connectMongo");

const connectDB = async () => {
  try {
    await connectMongo();
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    if (error.message?.includes("whitelist") || error.message?.includes("timed out")) {
      console.error(
        "Tip: In MongoDB Atlas → Network Access, allow your current IP (or 0.0.0.0/0 for testing)."
      );
    }
    process.exit(1);
  }
};

module.exports = connectDB;
