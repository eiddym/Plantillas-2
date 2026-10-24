'use strict';

const { colaPdf, colaCorreos, colaDocumentos } = require('./queues');
const { iniciarWorkers } = require('./workers');
const { checkRedisAvailable, getRedisConnection, REDIS_HOST, REDIS_PORT } = require('./connection');
const logger = require('../logger');

/**
 * Encola la generación de un PDF en BullMQ.
 * Si Redis no está disponible, ejecuta la tarea síncronamente como fallback.
 */
async function encolarPdf(datos) {
  if (checkRedisAvailable()) {
    try {
      const job = await colaPdf.add('generar-pdf', datos);
      logger.info(`[BullMQ] Tarea de PDF encolada exitosamente (Job ID #${job.id}).`);
      return { encolado: true, jobId: job.id };
    } catch (err) {
      logger.warn(`[BullMQ] Error al encolar PDF: ${err.message}. Ejecutando directamente en fallback.`);
    }
  }

  // Fallback directo
  const util = require('../util');
  const res = await util.crearPdf(datos.html, datos.rutaDestino, datos.opciones || {});
  return { encolado: false, resultado: res };
}

/**
 * Encola el envío de un correo electrónico en BullMQ.
 * Si Redis no está disponible, ejecuta el envío directamente en fallback.
 */
async function encolarCorreo(datos) {
  if (checkRedisAvailable()) {
    try {
      const job = await colaCorreos.add('enviar-correo', datos);
      logger.info(`[BullMQ] Correo a ${datos.para} encolado exitosamente (Job ID #${job.id}).`);
      return { encolado: true, jobId: job.id };
    } catch (err) {
      logger.warn(`[BullMQ] Error al encolar correo: ${err.message}. Enviando directamente en fallback.`);
    }
  }

  // Fallback directo
  const correo = require('../correo');
  const res = await correo.enviar(datos);
  return { encolado: false, resultado: res };
}

/**
 * Retorna las métricas y estado actual de las colas BullMQ y conexión Redis.
 */
async function obtenerEstadoColas() {
  const disponible = checkRedisAvailable();
  if (!disponible) {
    return {
      redis: {
        host: REDIS_HOST,
        port: REDIS_PORT,
        disponible: false,
        estado: 'desconectado / fallback directo activo'
      },
      colas: null
    };
  }

  try {
    const [pdfCounts, correoCounts, docCounts] = await Promise.all([
      colaPdf.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      colaCorreos.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      colaDocumentos.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed')
    ]);

    return {
      redis: {
        host: REDIS_HOST,
        port: REDIS_PORT,
        disponible: true,
        estado: 'conectado'
      },
      colas: {
        pdf: pdfCounts,
        correos: correoCounts,
        documentos: docCounts
      }
    };
  } catch (err) {
    return {
      redis: {
        host: REDIS_HOST,
        port: REDIS_PORT,
        disponible: false,
        error: err.message
      },
      colas: null
    };
  }
}

/**
 * Inicializa los workers de BullMQ.
 */
function iniciarSistemaColas() {
  try {
    getRedisConnection();
    iniciarWorkers();
    logger.info('[BullMQ + Redis] Sistema de colas y workers inicializado.');
  } catch (err) {
    logger.warn(`[BullMQ + Redis] No se pudieron arrancar los workers: ${err.message}`);
  }
}

module.exports = {
  encolarPdf,
  encolarCorreo,
  obtenerEstadoColas,
  iniciarSistemaColas,
  colaPdf,
  colaCorreos,
  colaDocumentos,
  getRedisConnection
};
