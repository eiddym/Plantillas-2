'use strict';

const { Queue } = require('bullmq');
const { getRedisOptions } = require('./connection');
const logger = require('../logger');

const connection = getRedisOptions();

// Definición de Colas BullMQ con lazy connection
const colaPdf = new Queue('generacion-pdf', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 }
  }
});

const colaCorreos = new Queue('envio-correos', {
  connection,
  defaultJobOptions: {
    attempts: 4,
    backoff: {
      type: 'exponential',
      delay: 3000
    },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 500 }
  }
});

const colaDocumentos = new Queue('procesamiento-documentos', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 1500
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 }
  }
});

module.exports = {
  colaPdf,
  colaCorreos,
  colaDocumentos
};
