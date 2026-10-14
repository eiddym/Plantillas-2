'use strict';

module.exports = app => {
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  app.get('/ready', async (req, res) => {
    try {
      await app.src.db.sequelize.authenticate();
      res.status(200).json({
        status: 'READY',
        database: 'CONNECTED',
        uptime: process.uptime()
      });
    } catch (error) {
      res.status(503).json({
        status: 'NOT_READY',
        database: 'DISCONNECTED',
        error: error.message
      });
    }
  });
};
