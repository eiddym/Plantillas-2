'use strict';

const axios = require('axios');
const logger = require('./logger');

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://wa.marabuntarl.com';
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY || 'ev_sec_42964e9a8f27b140cd3e82b719';
const WHATSAPP_INSTANCIA = process.env.WHATSAPP_INSTANCIA || 'marabunta';
const CODIGO_PAIS = process.env.WHATSAPP_CODIGO_PAIS || '591';

/**
 * Normaliza cualquier número boliviano o internacional a formato E.164 sin signo '+'
 * Ej: "77777777" -> "59177777777"
 *     "+591 777-77777" -> "59177777777"
 */
function normalizarNumero(numero) {
  if (!numero) return null;
  let limpio = String(numero).replace(/\D/g, '');
  if (limpio.length === 8) {
    limpio = `${CODIGO_PAIS}${limpio}`;
  }
  return limpio;
}

/**
 * Envía un mensaje de texto formateado por WhatsApp
 */
async function enviarTexto(numeroDestino, mensaje) {
  const numero = normalizarNumero(numeroDestino);
  if (!numero) {
    throw new Error('Número de celular inválido o no especificado.');
  }

  const url = `${WHATSAPP_API_URL.replace(/\/+$/, '')}/message/sendText/${WHATSAPP_INSTANCIA}`;

  const payload = {
    number: numero,
    text: mensaje,
    options: {
      delay: 1200,
      presence: 'composing'
    }
  };

  logger.info(`[WhatsApp] Enviando mensaje a ${numero} vía instancia "${WHATSAPP_INSTANCIA}"`);

  const response = await axios.post(url, payload, {
    headers: {
      'Content-Type': 'application/json',
      apikey: WHATSAPP_API_KEY
    },
    timeout: 15000
  });

  return response.data;
}

/**
 * Envía un documento PDF oficial adjunto por WhatsApp
 */
async function enviarPdf(numeroDestino, urlPdf, nombreArchivo, leyenda) {
  const numero = normalizarNumero(numeroDestino);
  if (!numero) throw new Error('Número de celular inválido.');

  const url = `${WHATSAPP_API_URL.replace(/\/+$/, '')}/message/sendMedia/${WHATSAPP_INSTANCIA}`;

  const payload = {
    number: numero,
    mediatype: 'document',
    mimetype: 'application/pdf',
    caption: leyenda || 'Documento Oficial',
    media: urlPdf,
    fileName: nombreArchivo || 'documento.pdf'
  };

  const response = await axios.post(url, payload, {
    headers: {
      'Content-Type': 'application/json',
      apikey: WHATSAPP_API_KEY
    },
    timeout: 30000
  });

  return response.data;
}

module.exports = {
  normalizarNumero,
  enviarTexto,
  enviarPdf
};

