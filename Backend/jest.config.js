/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/edge/**/*.test.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup/jest.setup.js"],
  testTimeout: 60000,
  forceExit: true,
  detectOpenHandles: true,
};
