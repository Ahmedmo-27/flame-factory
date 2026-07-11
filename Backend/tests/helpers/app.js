let cachedApp;

function getApp() {
  if (!cachedApp) {
    cachedApp = require("../../src/app");
  }
  return cachedApp;
}

module.exports = { getApp };
