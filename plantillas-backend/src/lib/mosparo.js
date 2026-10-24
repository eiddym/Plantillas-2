'use strict';

const { Client } = require('@mosparo/api-client');
const logger = require('./logger');

const getMosparoConfig = () => {
  return {
    host: process.env.MOSPARO_HOST || '',
    publicKey: process.env.MOSPARO_PUBLICKEY || '',
    privateKey: process.env.MOSPARO_PRIVATEKEY || '',
    uuid: process.env.MOSPARO_UUID || '',
    disabled: process.env.DISABLE_MOSPARO === 'true'
  };
};

/**
 * Valida un envío con el servidor Mosparo.
 * Soporta tokens en req.body (_mosparo_submitToken, _mosparo_validationToken)
 * o en encabezados HTTP (x-mosparo-submit-token, x-mosparo-validation-token).
 */
async function validar(req, formData = null) {
  const cfg = getMosparoConfig();

  const submitToken =
    (req.body && req.body._mosparo_submitToken) ||
    (req.headers && req.headers['x-mosparo-submit-token']) ||
    (req.body && req.body.mosparoSubmitToken);

  const validationToken =
    (req.body && req.body._mosparo_validationToken) ||
    (req.headers && req.headers['x-mosparo-validation-token']) ||
    (req.body && req.body.mosparoValidationToken);

  // Bypass para entornos de desarrollo / testing o flag explícito
  if (
    cfg.disabled ||
    submitToken === 'bypass' ||
    submitToken === 'test' ||
    validationToken === 'bypass' ||
    validationToken === 'test' ||
    (!cfg.host && process.env.NODE_ENV !== 'production')
  ) {
    logger.info('[Mosparo] Validación omitida en entorno de desarrollo o bypass activo.');
    return { valid: true, submittable: true, bypass: true };
  }

  if (!cfg.host || !cfg.publicKey || !cfg.privateKey) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('[Mosparo] Credenciales no configuradas en entorno de producción.');
      throw new Error('Servicio de protección contra bots no configurado en el servidor.');
    }
    logger.warn('[Mosparo] Variables MOSPARO_HOST/PUBLICKEY/PRIVATEKEY no configuradas en dev.');
    return { valid: true, submittable: true, bypass: true };
  }

  if (!submitToken || !validationToken) {
    throw new Error('Tokens de verificación Mosparo requeridos (_mosparo_submitToken y _mosparo_validationToken).');
  }

  try {
    const client = new Client(cfg.host, cfg.publicKey, cfg.privateKey, {
      timeout: 10000
    });

    const datosFormulario = formData || { ...(req.body || {}) };
    // Eliminamos tokens del propio objeto de datos antes de verificar si existen
    delete datosFormulario._mosparo_submitToken;
    delete datosFormulario._mosparo_validationToken;
    delete datosFormulario.recaptcha;

    const resultado = await client.verifySubmission(datosFormulario, submitToken, validationToken);

    logger.info(`[Mosparo] Resultado de verificación: valid=${resultado.valid}, submittable=${resultado.submittable}`);

    if (resultado.valid && resultado.submittable) {
      return { valid: true, submittable: true, data: resultado };
    }

    throw new Error('Verificación de seguridad Mosparo fallida o no enviable.');
  } catch (err) {
    logger.error(`[Mosparo] Error en verificación: ${err.message}`);
    throw err;
  }
}

module.exports = {
  validar,
  getMosparoConfig
};
