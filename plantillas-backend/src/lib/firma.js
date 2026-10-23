const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { exec } = require('child_process');
const logger = require('./logger');

const PATH_PKCS11_FIRMA = '/FirmaPkcs11PdfLib.jar';
const comandoBase = 'java -jar :libreriaJar -doc :documentoPdf';

/**
 * Ejecuta comando local Java JAR como fallback
 */
const ejecutarComando = (comando) => new Promise((resolve, reject) => {
  exec(comando, (error, stdout) => {
    try {
      if (error) throw Error(error);
      const resp = JSON.parse(stdout);
      return resolve(resp);
    } catch (e) {
      return reject(e);
    }
  });
});

/**
 * Valida firmas de un PDF conectándose al microservicio de firma digital REST
 * o utilizando el JAR local como fallback resiliente.
 * @param {string} pdf Ruta absoluta o relativa al PDF
 * @returns {Promise<{data: Array}>} Lista de firmas encontradas
 */
const obtenerFirmas = async (pdf) => {
  const serviceUrl = process.env.FIRMA_SERVICE_URL;

  // 1. Intento por Microservicio REST desacoplado (Spring Boot / Jacobitus)
  if (serviceUrl) {
    try {
      if (fs.existsSync(pdf)) {
        const fileBuffer = fs.readFileSync(pdf);
        const base64 = fileBuffer.toString('base64');

        const endpoint = serviceUrl.endsWith('/validar') ? serviceUrl : `${serviceUrl.replace(/\/$/, '')}/validar`;
        const response = await axios.post(endpoint, { base64 }, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000,
        });

        if (Array.isArray(response.data)) {
          const firmasNormalizadas = response.data.map(item => {
            const cert = item.certificado || {};
            return {
              nombreComunSubject: cert.nombreSignatario || item.nombreComunSubject || '',
              cargo: cert.cargoSignatario || '',
              organizacion: cert.organizacionSignatario || '',
              correo: cert.emailSignatario || '',
              ci: cert.ci || '',
              no_revocado: cert.revocado === null ? (item.firmadoAntesRevocacion !== false) : !cert.revocado,
              fechaFirma: item.fechaFirma || null,
              finValidez: cert.finValidez || null,
              cadenaConfianza: item.cadenaConfianza,
              noModificado: item.noModificado,
            };
          });

          return { data: firmasNormalizadas };
        }
      }
    } catch (errRest) {
      logger.warn(`Microservicio de firma no disponible en ${serviceUrl}, recurriendo a fallback:`, errRest.message);
    }
  }

  // 2. Fallback por JAR local si existe Java en el entorno
  try {
    const libreria = path.join(__dirname, PATH_PKCS11_FIRMA);
    if (fs.existsSync(libreria) && fs.existsSync(pdf)) {
      const comando = comandoBase.replace(':libreriaJar', libreria).replace(':documentoPdf', pdf);
      return await ejecutarComando(comando);
    }
  } catch (errJar) {
    logger.warn('No se pudo ejecutar validador JAR local:', errJar.message);
  }

  // 3. Fallback seguro sin firmas (no bloquear flujo si no hay motor PKCS11 activo)
  return { data: [] };
};

module.exports = {
  obtenerFirmas,
  ejecutarComando,
};
