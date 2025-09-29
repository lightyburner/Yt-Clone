const app = require('./app');
const env = require('../config/env');
const { testConnection } = require('../config/database');
const createTables = require('../config/createTables');

const port = env.port;

const startServer = async () => {
  try {
    await testConnection();
    await createTables();

    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`🚀 Server running on port ${port}`);
      // eslint-disable-next-line no-console
      console.log(`🌍 Environment: ${env.nodeEnv}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();


