'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const logger = require('./logger');

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://wa.marabuntarl.com';
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY || 'ev_sec_42964e9a8f27b140cd3e82b719';
const WHATSAPP_INSTANCIA = process.env.WHATSAPP_INSTANCIA || 'marabunta';
const CODIGO_PAIS = process.env.WHATSAPP_CODIGO_PAIS || '591';
const CONFIG_FILE = path.resolve('./runtime-config/whatsapp-config.json');

function leerConfigPersistencia() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (e) {
    logger.warn('[WhatsApp] Error leyendo configuración persistente:', e.message);
  }
  return {
    grupoId: process.env.WHATSAPP_GRUPO_ID || '',
    grupoNombre: ''
  };
}

function guardarGrupoInstitucional(grupoId, grupoNombre = '') {
  try {
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const data = {
      grupoId: String(grupoId || '').trim(),
      grupoNombre: String(grupoNombre || '').trim(),
      actualizado: new Date().toISOString()
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2), 'utf8');
    process.env.WHATSAPP_GRUPO_ID = data.grupoId;
    return data;
  } catch (e) {
    logger.error('[WhatsApp] Error guardando grupo institucional:', e.message);
    throw e;
  }
}

/**
 * Normaliza cualquier número boliviano, internacional o JID de Grupo (@g.us)
 * Ej: "77777777" -> "59177777777"
 *     "+591 777-77777" -> "59177777777"
 *     "120363284910293847@g.us" -> "120363284910293847@g.us"
 */
function normalizarNumero(numero) {
  if (!numero) return null;
  const raw = String(numero).trim();
  if (raw.endsWith('@g.us') || raw.endsWith('@s.whatsapp.net')) {
    return raw;
  }
  let limpio = raw.replace(/\D/g, '');
  if (!limpio) return null;
  if (limpio.length >= 15) {
    return `${limpio}@g.us`;
  }
  if (limpio.length === 8) {
    limpio = `${CODIGO_PAIS}${limpio}`;
  }
  return limpio;
}

/**
 * Obtiene el estado de conexión actual de la instancia en Evolution API
 */
async function obtenerEstadoConexion() {
  const url = `${WHATSAPP_API_URL.replace(/\/+$/, '')}/instance/connectionState/${WHATSAPP_INSTANCIA}`;
  const response = await axios.get(url, {
    headers: { apikey: WHATSAPP_API_KEY },
    timeout: 12000
  });
  const cfg = leerConfigPersistencia();
  return {
    instancia: WHATSAPP_INSTANCIA,
    estado: response.data?.instance?.state || 'close',
    grupoId: cfg.grupoId || process.env.WHATSAPP_GRUPO_ID || '',
    grupoNombre: cfg.grupoNombre || ''
  };
}

/**
 * Obtiene o genera el código QR en base64 para vincular el WhatsApp corporativo
 */
async function obtenerQrConexion() {
  const baseUrl = WHATSAPP_API_URL.replace(/\/+$/, '');
  try {
    const response = await axios.get(`${baseUrl}/instance/connect/${WHATSAPP_INSTANCIA}`, {
      headers: { apikey: WHATSAPP_API_KEY },
      timeout: 15000
    });
    return response.data;
  } catch (err) {
    // Si la instancia no existe aún, crearla automáticamente y devolver su QR
    const createResp = await axios.post(`${baseUrl}/instance/create`, {
      instanceName: WHATSAPP_INSTANCIA,
      token: 'token_seguro_marabunta_2026',
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS'
    }, {
      headers: {
        'Content-Type': 'application/json',
        apikey: WHATSAPP_API_KEY
      },
      timeout: 15000
    });
    return createResp.data?.qrcode || createResp.data;
  }
}

/**
 * Envía un mensaje de texto formateado por WhatsApp (a usuario individual o grupo @g.us)
 */
async function enviarTexto(numeroDestino, mensaje) {
  const conn = await obtenerEstadoConexion().catch(() => ({ estado: 'close' }));
  if (conn.estado !== 'open') {
    throw new Error('La instancia de WhatsApp no está vinculada. Ingrese a su Perfil y escanee el código QR para conectar el dispositivo.');
  }

  const numero = normalizarNumero(numeroDestino);
  if (!numero) {
    throw new Error('Número de celular o ID de grupo inválido o no especificado.');
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
 * Envía un documento PDF oficial adjunto por WhatsApp (URL o Base64)
 */
async function enviarPdf(numeroDestino, urlOBase64Pdf, nombreArchivo, leyenda) {
  const conn = await obtenerEstadoConexion().catch(() => ({ estado: 'close' }));
  if (conn.estado !== 'open') {
    throw new Error('La instancia de WhatsApp no está vinculada para enviar adjuntos.');
  }

  const numero = normalizarNumero(numeroDestino);
  if (!numero) throw new Error('Número de celular o ID de grupo inválido.');

  const url = `${WHATSAPP_API_URL.replace(/\/+$/, '')}/message/sendMedia/${WHATSAPP_INSTANCIA}`;

  let mediaValue = urlOBase64Pdf;
  if (typeof mediaValue === 'string' && mediaValue.includes('base64,')) {
    mediaValue = mediaValue.split('base64,')[1];
  }

  const payload = {
    number: numero,
    mediatype: 'document',
    mimetype: 'application/pdf',
    caption: leyenda || 'Documento Oficial',
    media: mediaValue,
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

/**
 * Obtiene la lista de grupos de WhatsApp donde participa la instancia corporativa
 */
async function obtenerGrupos() {
  const conn = await obtenerEstadoConexion().catch(() => ({ estado: 'close' }));
  if (conn.estado !== 'open') {
    return [];
  }
  const url = `${WHATSAPP_API_URL.replace(/\/+$/, '')}/group/fetchAllGroups/${WHATSAPP_INSTANCIA}?getParticipants=false`;
  const response = await axios.get(url, {
    headers: {
      apikey: WHATSAPP_API_KEY
    },
    timeout: 10000
  });
  return Array.isArray(response.data) ? response.data : [];
}

/**
 * Envía una difusión global (Convocatoria, Circular, Comunicado o Documento Institucional)
 * únicamente al Grupo Oficial de WhatsApp de la Institución (sin spam individual).
 */
async function enviarAGrupoInstitucional(mensaje, opciones = {}) {
  const cfg = leerConfigPersistencia();
  let grupoId = opciones.grupoId || cfg.grupoId || process.env.WHATSAPP_GRUPO_ID || '';
  if (!grupoId) {
    try {
      const grupos = await obtenerGrupos();
      if (grupos.length > 0 && grupos[0].id) {
        grupoId = grupos[0].id;
      }
    } catch (e) {
      logger.warn('[WhatsApp Grupo] No se pudo autodetectar grupo institucional:', e.message);
    }
  }

  if (!grupoId) {
    logger.warn('[WhatsApp Grupo] WHATSAPP_GRUPO_ID no configurado y sin grupos detectados aún.');
    return { enviado: false, motivo: 'WHATSAPP_GRUPO_ID no configurado' };
  }

  const resTexto = await enviarTexto(grupoId, mensaje);

  if (opciones.pdfMedia) {
    try {
      await enviarPdf(
        grupoId,
        opciones.pdfMedia,
        opciones.nombreArchivo || 'Documento_Oficial.pdf',
        opciones.leyendaPdf || '📄 Documento Oficial Adjunto'
      );
    } catch (ePdf) {
      logger.warn('[WhatsApp Grupo] Texto enviado, pero falló adjunto PDF:', ePdf.message);
    }
  }

  return { enviado: true, grupoId, data: resTexto };
}

module.exports = {
  normalizarNumero,
  obtenerEstadoConexion,
  obtenerQrConexion,
  guardarGrupoInstitucional,
  leerConfigPersistencia,
  enviarTexto,
  enviarPdf,
  obtenerGrupos,
  enviarAGrupoInstitucional
};
