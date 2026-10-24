'use strict';

const { Worker } = require('bullmq');
const { getRedisOptions, checkRedisAvailable } = require('./connection');
const logger = require('../logger');

let workersIniciados = false;
const workers = [];

function iniciarWorkers() {
  if (workersIniciados) {
    return workers;
  }

  const connection = getRedisOptions();

  try {
    // 1. Worker para procesamiento y generación pesada de PDF
    const workerPdf = new Worker(
      'generacion-pdf',
      async (job) => {
        logger.info(`[BullMQ Worker:PDF] Procesando trabajo #${job.id}: ${job.name}`);
        const { html, rutaDestino, opciones } = job.data;
        const util = require('../util');
        
        const resultado = await util.crearPdf(html, rutaDestino, opciones || {});
        logger.info(`[BullMQ Worker:PDF] PDF generado exitosamente para trabajo #${job.id}`);
        return resultado;
      },
      {
        connection,
        concurrency: 2 // Máximo 2 PDFs pesados en paralelo
      }
    );

    workerPdf.on('completed', (job) => {
      logger.info(`[BullMQ Worker:PDF] Trabajo #${job.id} finalizado exitosamente.`);
    });

    workerPdf.on('error', (err) => {
      // Ignorar en dev si redis no está corriendo
    });

    // 2. Worker para despacho de correos electrónicos
    const workerCorreos = new Worker(
      'envio-correos',
      async (job) => {
        logger.info(`[BullMQ Worker:Correo] Enviando correo a ${job.data.para} - Asunto: "${job.data.titulo}"`);
        const correo = require('../correo');
        const resultado = await correo.enviar(job.data);
        return resultado;
      },
      {
        connection,
        concurrency: 5
      }
    );

    workerCorreos.on('completed', (job) => {
      logger.info(`[BullMQ Worker:Correo] Correo enviado exitosamente (Job #${job.id}).`);
    });

    workerCorreos.on('error', (err) => {
      // Ignorar en dev si redis no está corriendo
    });

    workers.push(workerPdf, workerCorreos);
    workersIniciados = true;
    logger.info('[BullMQ] Workers configurados para tareas en segundo plano.');
  } catch (err) {
    logger.warn(`[BullMQ] Workers no iniciados (Redis no listo): ${err.message}`);
  }

  return workers;
}

module.exports = {
  iniciarWorkers,
  workers
};
