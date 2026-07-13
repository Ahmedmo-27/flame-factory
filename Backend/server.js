const dotenv = require("dotenv");
const connectDB = require("./src/config/db");
const app = require("./src/app");
const logger = require("./src/utils/logger");
const { BCRYPT_ROUNDS } = require("./src/utils/passwordUtils");
const { startScheduledTasks } = require("./src/utils/scheduledTasks");

dotenv.config();
connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    logger.info("server", "Server started", {
        port: PORT,
        nodeEnv: process.env.NODE_ENV || "development",
        hasJwtSecret: Boolean(process.env.JWT_SECRET),
        hasMongoUri: Boolean(process.env.MONGO_URI),
        bcryptRounds: BCRYPT_ROUNDS,
        logLevel: process.env.LOG_LEVEL || "info",
    });

    // Start background tasks (freeze auto-unfreeze, etc.)
    startScheduledTasks();
});
