// The website serves the web app under /app (pvtfrnd.com/app); EXPO_BASE_URL sets that for web exports only.
module.exports = ({ config }) => ({
  ...config,
  experiments: { ...config.experiments, ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}) },
});
