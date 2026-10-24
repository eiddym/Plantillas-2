'use strict';

const Redis = require('ioredis');
const logger = require('../logger');

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

function getRedisOptions() {
  return {
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    maxRetriesPerRequest: null, // Requerido por BullMQ
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy(times) {
      // En dev, detener reintentos continuos tras 3 intentos para no bloquear el event loop
      if (process.env.NODE_ENV !== 'production' && times > 3) {
        return null;
      }
      return Math.min(times * 300, 3000);
    }
  };
}

let redisConnection = null;
let isRedisAvailable = false;

function getRedisConnection() {
  if (!redisConnection) {
    const options = getRedisOptions();
    redisConnection = new Redis(options);

    redisConnection.on('connect', () => {
      isRedisAvailable = true;
      logger.info(`[Redis] Conectado exitosamente en ${REDIS_HOST}:${REDIS_PORT}`);
    });

    redisConnection.on('ready', () => {
      isRedisAvailable = true;
      logger.info('[Redis] Instancia lista para BullMQ / Caché.');
    });

    redisConnection.on('error', (err) => {
      isRedisAvailable = false;
      if (process.env.NODE_ENV !== 'production') {
        logger.warn(`[Redis] No disponible en ${REDIS_HOST}:${REDIS_PORT} (${err.code || err.message}). Fallback directo activo.`);
      } else {
        logger.error(`[Redis] Error: ${err.message}`);
      }
    });

    redisConnection.on('close', () => {
      isRedisAvailable = false;
    });

    // Intentar conectar una vez
    redisConnection.connect().catch((err) => {
      isRedisAvailable = false;
    });
  }

  return redisConnection;
}

function checkRedisAvailable() {
  return isRedisAvailable && redisConnection && redisConnection.status === 'ready';
}

module.exports = {
  getRedisOptions,
  getRedisConnection,
  checkRedisAvailable,
  REDIS_HOST,
  REDIS_PORT
};
