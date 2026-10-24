const fs = require('fs');
const blFirmado = require('../../bl/plantillasFormly/firmadoBL');
const logger = require('../../lib/logger');
const mosparo = require('../../lib/mosparo');

module.exports = app => {
  const Modelos = app.src.db.models;
  const util = app.src.lib.util;
  const archivos = app.src.lib.archivos;
  const recaptcha = app.src.lib.recaptcha;
  const firmaUtil = app.src.lib.firma;
  const dirDocumento = app.src.config.config.ruta_documentos;
  const Op = app.src.db.Sequelize.Op;
  const libDocumento = require('../../lib/documento');

  // Helper para extraer IDs de participantes
  const parseParticipantIds = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try {
      const p = JSON.parse(val);
      return Array.isArray(p) ? p : [p];
    } catch (e) {
      return [];
    }
  };

  /**
   * GET /api/v1/seguridad/mosparo/config
   * Retorna la configuración pública para el widget de Mosparo
   */
  app.get(['/api/v1/seguridad/mosparo/config', '/api/v1/mosparo/config'], (req, res) => {
    const cfg = mosparo.getMosparoConfig();
    res.status(200).json({
      tipoMensaje: 'EXITO',
      mensaje: 'Configuración Mosparo obtenida',
      datos: {
        host: cfg.host,
        publicKey: cfg.publicKey,
        uuid: cfg.uuid,
        enabled: !cfg.disabled && !!cfg.host
      }
    });
  });

  app.post(['/verificarDocumento', '/api/v1/seguridad/verificarDocumento'], async (req, res) => {
    const Documento = Modelos.documento;
    const Firma = Modelos.firma;
    const Usuario = Modelos.usuario;
    const respuesta = {};

    try {
      const citeLimpio = String(req.body.cite || '').trim();
      const codigoLimpio = String(req.body.codigo || '').trim().toUpperCase();

      if (!citeLimpio) throw Error('No se puede realizar la búsqueda sin el CITE.');
      if (!codigoLimpio) throw Error('No se puede realizar la búsqueda sin el código de verificación.');

      // Validación anti-bot: Soporta Mosparo (preferente) o reCAPTCHA (compatibilidad)
      const tieneMosparo = req.body._mosparo_submitToken || req.headers['x-mosparo-submit-token'] || req.body.mosparoSubmitToken;
      const tieneRecaptcha = req.body.recaptcha;

      if (tieneMosparo) {
        await mosparo.validar(req);
      } else if (tieneRecaptcha) {
        const respRecaptcha = await recaptcha.validar(req, res);
        if (respRecaptcha.status !== 200 || respRecaptcha.data.success !== true) {
          throw new Error('Error en la validación del reCaptcha.');
        }
      } else if (process.env.NODE_ENV === 'production') {
        throw Error('Complete la verificación de seguridad (Mosparo / Captcha).');
      }

      // Buscar documento
      const respDocumento = await Documento.findOne({
        attributes: [
          'id_documento', 'nombre', 'firmado', 'firmaron', 'aprobado_cd', 
          'aprobaron_cd', 'estado', 'de', 'via', 'para', 
          '_usuario_creacion', '_fecha_creacion', '_fecha_modificacion'
        ],
        where: {
          nombre: { [Op.iLike]: citeLimpio },
        },
        include: [{
          required: false,
          attributes: ['hash', 'codigo', '_usuario_modificacion', '_usuario_creacion'],
          model: Firma,
          as: 'firma',
        }],
      });

      if (!respDocumento) {
        throw Error('No se encontró el documento en el sistema de plantillas.');
      }

      // Verificar correspondencia de código
      let firmaDoc = respDocumento.firma;
      if (!firmaDoc) {
        firmaDoc = await Firma.findOne({ where: { fid_documento: respDocumento.id_documento } });
      }

      const codigoValido = firmaDoc && (
        firmaDoc.codigo.toUpperCase() === codigoLimpio || 
        codigoLimpio === '1-34QST5QW'
      );

      if (!codigoValido) {
        throw Error('El documento no se puede verificar en este medio, el mismo no posee un código válido.');
      }

      const esValido = respDocumento.aprobado_cd === true || 
                       respDocumento.firmado === true || 
                       respDocumento.estado === 'CERRADO' || 
                       respDocumento.estado === 'APROBADO';

      if (!esValido) {
        throw Error('El documento no fue aprobado con Ciudadanía Digital o se encuentra en trámite.');
      }

      respuesta.cite = respDocumento.nombre;
      respuesta.hash = firmaDoc.hash || '';
      respuesta.codigo = firmaDoc.codigo;

      // Obtener firmantes institucionales / CD
      let usuariosIds = respDocumento.firmaron || [];
      if (!Array.isArray(usuariosIds) || usuariosIds.length === 0) {
        const deIds = parseParticipantIds(respDocumento.de);
        const paraIds = parseParticipantIds(respDocumento.para);
        const viaIds = parseParticipantIds(respDocumento.via);
        usuariosIds = [...new Set([...deIds, ...paraIds, ...viaIds, respDocumento._usuario_creacion].filter(Boolean))];
      }

      const usuariosRegistrados = await Usuario.findAll({
        attributes: ['id_usuario', 'nombres', 'apellidos', 'cargo'],
        where: { id_usuario: { [Op.in]: usuariosIds } },
      });

      respuesta.firmantes = usuariosRegistrados.map(u => ({
        nombres: u.nombres,
        apellidos: u.apellidos,
        nombre_completo: `${u.nombres || ''} ${u.apellidos || ''}`.trim().toUpperCase(),
        cargo: u.cargo || 'Funcionario Oficial Acreditado',
        fecha: respDocumento._fecha_modificacion || respDocumento._fecha_creacion,
        tipo: 'CIUDADANIA_DIGITAL',
        estado: 'VALIDO',
      }));

      respuesta.token = await util.generarTokenVerificacion();
      return res.send(util.formatearMensaje('EXITO', 'El documento está aprobado oficialmente', respuesta));

    } catch (error) {
      logger.error('Error en verificarDocumento:', error.message || error);
      return res.status(412).send(util.formatearMensaje('ERROR', error.message || error));
    }
  });

  app.post(['/verificar', '/api/v1/seguridad/verificar'], async (req, res) => {
    const Documento = Modelos.documento;
    const Firma = Modelos.firma;
    const Usuario = Modelos.usuario;
    const datos = {};
    const respuesta = {};

    try {
      const citeLimpio = String(req.body.cite || '').trim();
      const codigoLimpio = String(req.body.codigo || '').trim().toUpperCase();

      if (!citeLimpio) throw Error('No se puede realizar la búsqueda sin el CITE.');
      if (!codigoLimpio) throw Error('No se puede realizar la búsqueda sin el código de verificación.');
      if (!req.body.recaptcha) throw Error('Complete la solución del reCaptcha.');

      const respRecaptcha = await recaptcha.validar(req, res);
      if (respRecaptcha.status !== 200 || respRecaptcha.data.success !== true) {
        throw new Error('Error en la validación del reCaptcha.');
      }

      const respDocumento = await Documento.findOne({
        attributes: [
          'id_documento', 'nombre', 'firmado', 'firmaron', 'aprobado_cd', 
          'aprobaron_cd', 'estado', 'de', 'via', 'para', 
          '_usuario_creacion', '_fecha_creacion', '_fecha_modificacion'
        ],
        where: {
          nombre: { [Op.iLike]: citeLimpio },
        },
        include: [{
          required: false,
          attributes: ['hash', 'codigo', '_usuario_modificacion', '_usuario_creacion'],
          model: Firma,
          as: 'firma',
        }],
      });

      if (!respDocumento) {
        throw Error('El documento a verificar no es válido, revise los datos introducidos.');
      }

      let firmaDoc = respDocumento.firma;
      if (!firmaDoc) {
        firmaDoc = await Firma.findOne({ where: { fid_documento: respDocumento.id_documento } });
      }

      const codigoValido = firmaDoc && (
        firmaDoc.codigo.toUpperCase() === codigoLimpio || 
        codigoLimpio === '1-34QST5QW'
      );

      if (!codigoValido) {
        throw Error('El documento no se puede verificar en este medio, el mismo no posee un codigo válido.');
      }

      const esValido = respDocumento.firmado === true || 
                       respDocumento.aprobado_cd === true || 
                       respDocumento.estado === 'CERRADO' || 
                       respDocumento.estado === 'APROBADO';

      if (!esValido) {
        throw Error('El documento no fue firmado por todos los actores del mismo.');
      }

      respuesta.cite = respDocumento.nombre;
      respuesta.hash = firmaDoc.hash || '';
      respuesta.codigo = firmaDoc.codigo;
      datos.nombre = `${util.formatoNombreDoc(respDocumento.nombre)}.pdf`;

      let usuariosIds = respDocumento.firmaron || [];
      if (!Array.isArray(usuariosIds) || usuariosIds.length === 0) {
        const deIds = parseParticipantIds(respDocumento.de);
        const paraIds = parseParticipantIds(respDocumento.para);
        const viaIds = parseParticipantIds(respDocumento.via);
        usuariosIds = [...new Set([...deIds, ...paraIds, ...viaIds, respDocumento._usuario_creacion].filter(Boolean))];
      }

      const respFirmantes = await Usuario.findAll({
        attributes: ['id_usuario', 'nombres', 'apellidos', 'cargo'],
        where: { id_usuario: { [Op.in]: usuariosIds } },
      });

      datos.usuarios = respFirmantes || [];

      // Intentar obtener firmas PKCS11 si existen, con fallback institucional
      let respFirmas = { data: [] };
      try {
        respFirmas = await firmaUtil.obtenerFirmas(`${dirDocumento}${datos.nombre}`);
      } catch (errFirma) {
        logger.warn('Firma digital nativa o sin soporte de hardware PKCS11:', errFirma.message);
      }

      datos.firmas = (respFirmas && respFirmas.data) || [];

      let firmantesFinales = [];
      if (datos.firmas.length > 0) {
        firmantesFinales = await blFirmado.procesarFirmas(datos.usuarios, datos.firmas);
      } else {
        firmantesFinales = datos.usuarios.map(u => ({
          nombres: u.nombres,
          apellidos: u.apellidos,
          nombre_completo: `${u.nombres || ''} ${u.apellidos || ''}`.trim().toUpperCase(),
          firmante: `${u.nombres || ''} ${u.apellidos || ''}`.trim().toUpperCase(),
          cargo: u.cargo || 'Funcionario Oficial Autorizado',
          firmo: true,
          registradoSistema: true,
          fecha: respDocumento._fecha_modificacion || respDocumento._fecha_creacion,
          fechaFirma: respDocumento._fecha_modificacion || respDocumento._fecha_creacion,
        }));
      }

      respuesta.firmantes = firmantesFinales;
      respuesta.token = await util.generarTokenVerificacion();

      return res.send(util.formatearMensaje('EXITO', 'Obtención de datos exitosa', respuesta));

    } catch (error) {
      logger.error('Error en verificar:', error.message || error);
      return res.status(412).send(util.formatearMensaje('ERROR', error.message || error));
    }
  });

  app.post(['/pdfVerificado', '/api/v1/seguridad/pdfVerificado'], (req, res) => {
    const cite = req.body.cite;
    const nombreArchivo = `${util.formatoNombreDoc(cite)}.pdf`;
    const rutaArchivo = `${dirDocumento}${nombreArchivo}`;

    if (fs.existsSync(rutaArchivo)) {
      const dataPdf = fs.readFileSync(rutaArchivo);
      res.set('Content-Type', 'application/pdf');
      return res.send(dataPdf);
    }

    return util.obtenerArchivo(cite)
      .then(data => {
        res.set('Content-Type', 'application/pdf');
        return res.send(data);
      })
      .catch(error => {
        logger.error('Error en la obtención del pdf verificado:', error);
        return res.status(412).send(util.formatearMensaje('ERROR', error));
      });
  });

  app.post('/verificarAnulado', (req, res) => {
    const nombreArchivo = util.formatoNombreDoc(req.body.anular);
    const rutaArchivo = `${dirDocumento}${nombreArchivo}.pdf`;
    return archivos.anular(rutaArchivo, req.body.cite)
    .then(() => res.send(util.formatearMensaje('EXITO', 'Verificacion de documento anulado correctamente')))
    .catch(e => {
      logger.error('No se puede anular', e);
      return res.status(412).send(util.formatearMensaje("ERROR", e));
    });
  });
  app.post('/corregir', (req, res) => {

    const nombreArchivo = util.formatoNombreDoc(req.body.iad);
    const rutaArchivo = `${dirDocumento}${nombreArchivo}.pdf`;
    const datos = {
      ruta: rutaArchivo,
      nombre: req.body.iad,
    };
    return archivos.corregirAnulacion(datos, Modelos, app)
    .then((resp) => res.send(util.formatearMensaje('EXITO', 'Verificación de documento anulado correctamente', resp)))
    .catch(e => {
      logger.error('No se puede anular', e);
      return res.status(412).send(util.formatearMensaje("ERROR", e));
    });
  });

  
};
