/*
 * Recursos para envío de correo.
 */

const nodemailer = require('nodemailer');
const logger = require('./logger');
const config = require('../config/config');
const Promise = require('bluebird');

const correoConfig = config().correo;

const transporte = nodemailer.createTransport({
  host: correoConfig.host,
  port: correoConfig.port,
  secure: correoConfig.secure,
  ignoreTLS: correoConfig.ignoreTLS,
  auth: {
    user: correoConfig.user,
    pass: correoConfig.pass,
  },
  tls: correoConfig.tls,
});

const correo = {
  enviar: function(datosEnvio) {
    return new Promise((resolve, reject) => {
      const opciones = {
        from: correoConfig.origen,
        to: datosEnvio.para,
        subject: datosEnvio.titulo,
        text: datosEnvio.mensaje,
        html: datosEnvio.html,
      };

      transporte.sendMail(opciones, function(error, info) {
        if (error) {
          logger.error('Error enviando correo', error);
          return reject(error);
        }

        logger.info('Mensaje enviado: ' + info.response);
        resolve(info);
      });
    });
  },

  verificar: function() {
    return new Promise((resolve, reject) => {
      transporte.verify(function(error, success) {
        if (error) {
          logger.error('SMTP no disponible', error);
          return reject(error);
        }

        logger.info('SMTP disponible');
        resolve(success);
      });
    });
  },
};

module.exports = correo;
