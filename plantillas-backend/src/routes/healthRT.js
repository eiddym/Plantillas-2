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

  app.get(['/health/queue', '/api/v1/health/queue'], async (req, res) => {
    try {
      const queue = require('../lib/queue');
      const estado = await queue.obtenerEstadoColas();
      res.status(200).json({
        tipoMensaje: 'EXITO',
        mensaje: 'Estado de colas BullMQ y conexión Redis',
        datos: estado
      });
    } catch (err) {
      res.status(500).json({
        tipoMensaje: 'ERROR',
        mensaje: err.message
      });
    }
  });

  app.get(['/health/mosparo', '/api/v1/health/mosparo'], (req, res) => {
    const mosparo = require('../lib/mosparo');
    const cfg = mosparo.getMosparoConfig();
    res.status(200).json({
      tipoMensaje: 'EXITO',
      mensaje: 'Estado de configuración Mosparo',
      datos: {
        host: cfg.host,
        publicKeyConfigurada: !!cfg.publicKey,
        privateKeyConfigurada: !!cfg.privateKey,
        habilitado: !cfg.disabled && !!cfg.host
      }
    });
  });
};
