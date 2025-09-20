const { sequelize } = require('./database');
const User = require('../models/User');

const createTables = async () => {
  try {
    // Sync all models
    await sequelize.sync({ alter: true });
    console.log('✅ Tables created successfully');
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
  }
};

module.exports = createTables;
