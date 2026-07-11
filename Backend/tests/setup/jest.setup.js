const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env.test") });

process.env.NODE_ENV = "test";
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "edge-test-jwt-secret-do-not-use-in-production";
}
