'use strict';

const correo = require('../../lib/correo');
const logger = require('../../lib/logger');

module.exports = app => {
  const Documento = app.src.db.models.documento;
  const Usuario = app.src.db.models.usuario;
  const UsuarioRol = app.src.db.models.usuario_rol;
  const Rol = app.src.db.models.rol;
  const Unidad = app.src.db.models.unidad;
  const Correlativo = app.src.db.models.correlativo;
  const HistorialFlujo = app.src.db.models.historial_flujo;
  const PlantillaFormly = app.src.db.models.plantilla_formly;
  const util = app.src.lib.util;
  const Op = app.src.db.Sequelize.Op;
  const config = app.src.config.config;

  /**
   * Genera el siguiente código de Hoja de Ruta consecutivo.
   * Formato: HR-2026-00001
   */
  async function generarCodigoHojaRuta(anio, idUsuario = 1) {
    const anioActual = String(anio || new Date().getFullYear());
    const abreviacionHR = 'HOJA_RUTA';

    let corr = await Correlativo.findOne({
      where: { abreviacion: abreviacionHR, anio: anioActual }
    });

    let num = 1;
    if (!corr) {
      corr = await Correlativo.create({
        abreviacion: abreviacionHR,
        anio: anioActual,
        valor: 2,
        _usuario_creacion: idUsuario
      });
      num = 1;
    } else {
      num = corr.valor;
      await corr.update({
        valor: corr.valor + 1,
        _usuario_modificacion: idUsuario
      });
    }

    const padded = String(num).padStart(5, '0');
    return `HR-${anioActual}-${padded}`;
  }

  /**
   * Genera el CITE oficial interno para la plantilla Documento Externo (DE-A).
   * Formato: PLANTILLAS-DGE/DE-A/00001/2026
   */
  async function generarCiteDocumentoExterno(unidadAbrev, anio, idUsuario = 1) {
    const citeGuia = (config.sistema && config.sistema.cite_principal) ? config.sistema.cite_principal : 'PLANTILLAS';
    const anioActual = String(anio || new Date().getFullYear());
    const abrevDoc = 'DE-A';
    const prefijo = unidadAbrev ? `${citeGuia}-${unidadAbrev}/${abrevDoc}` : `${citeGuia}/${abrevDoc}`;

    let corr = await Correlativo.findOne({
      where: { abreviacion: prefijo, anio: anioActual }
    });

    let num = 1;
    if (!corr) {
      corr = await Correlativo.create({
        abreviacion: prefijo,
        anio: anioActual,
        valor: 2,
        _usuario_creacion: idUsuario
      });
      num = 1;
    } else {
      num = corr.valor;
      await corr.update({
        valor: corr.valor + 1,
        _usuario_modificacion: idUsuario
      });
    }

    const padded = String(num).padStart(5, '0');
    return `${prefijo}/${padded}/${anioActual}`;
  }

  /**
   * Envia correo de notificación formal al solicitante externo.
   */
  async function enviarCorreoRadicacion(destinatario, datos) {
    if (!destinatario || !destinatario.includes('@')) return false;

    const asunto = `[Ventanilla Única] Confirmación de Radicación - Hoja de Ruta ${datos.codigo_hoja_ruta}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #0f2027 0%, #203a43 100%); color: #ffffff; padding: 24px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px; letter-spacing: 0.5px;">COOPERATIVA MINERA MARABUNTA R.L.</h2>
          <p style="margin: 6px 0 0; font-size: 13px; color: #00b4db;">SISTEMA INTEGRAL DE VENTANILLA ÚNICA DIGITAL</p>
        </div>
        <div style="padding: 26px 24px; background: #ffffff;">
          <p style="font-size: 15px; color: #334155;">Estimado(a) <strong>${datos.remitente || 'Ciudadano(a)'}</strong>,</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">
            Le confirmamos que su trámite ha sido radicado exitosamente en nuestra Ventanilla Única con plena validez jurídica e ingresado al flujo institucional.
          </p>
          
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-left: 5px solid #0083b0; border-radius: 8px; padding: 16px 20px; margin: 20px 0;">
            <p style="margin: 0 0 6px; font-size: 11.5px; font-weight: bold; color: #64748b; text-transform: uppercase;">Código de Hoja de Ruta Oficial:</p>
            <h1 style="margin: 0; font-size: 24px; color: #0083b0; font-family: monospace;">${datos.codigo_hoja_ruta}</h1>
            <p style="margin: 10px 0 4px; font-size: 13px; color: #334155;"><strong>Referencia:</strong> ${datos.referencia}</p>
            <p style="margin: 0; font-size: 12.5px; color: #64748b;"><strong>Fecha de Radicación:</strong> ${new Date().toLocaleString('es-BO')}</p>
          </div>

          <p style="font-size: 13.5px; color: #475569; line-height: 1.5;">
            Puede realizar el seguimiento en tiempo real del estado de su trámite ingresando su Código de Hoja de Ruta en nuestro portal oficial de Ventanilla Única Virtual.
          </p>
        </div>
        <div style="background: #f1f5f9; padding: 14px 24px; text-align: center; font-size: 11.5px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          Uyuni, Potosí - Bolivia | Este correo es una notificación automática del sistema.
        </div>
      </div>
    `;

    try {
      await correo.enviar({
        para: destinatario,
        titulo: asunto,
        mensaje: `Trámite radicado exitosamente. Hoja de Ruta: ${datos.codigo_hoja_ruta}. Referencia: ${datos.referencia}`,
        html: html
      });
      return true;
    } catch (e) {
      logger.warn('[Ventanilla Correo] No se pudo enviar notificación por email:', e.message || e);
      return false;
    }
  }

  /**
   * POST /api/v1/ventanilla/radicar
   * Radicación pública desde el portal ciudadano / ventanilla virtual.
   */
  app.post('/api/v1/ventanilla/radicar', async (req, res) => {
    try {
      const {
        ci,
        nombreCompleto,
        remitente,
        email,
        telefono,
        entidad,
        tipoTramite,
        citeExterno,
        referencia,
        fojas,
        prioridad,
        archivo_adjunto
      } = req.body;

      const nombreSolicitante = nombreCompleto || remitente;
      if (!nombreSolicitante || !referencia) {
        return res.status(400).send(util.formatearMensaje("ERROR", "El nombre del remitente y la referencia son obligatorios."));
      }

      const anioActual = new Date().getFullYear();
      const codigoHR = await generarCodigoHojaRuta(anioActual, 1);

      // Obtener o simular plantilla 'Documento Externo' (id 36)
      const plantillaDef = await PlantillaFormly.findOne({
        where: { abreviacion: 'DE-A', estado: 'ACTIVO' }
      });

      const datosRemitente = {
        ci: ci || '',
        remitente: nombreSolicitante,
        email: email || '',
        telefono: telefono || '',
        entidad: entidad || '',
        tipoTramite: tipoTramite || 'NOTA_OFICIAL',
        citeExterno: citeExterno || '',
        referencia: referencia,
        fojas: Number(fojas) || 1,
        prioridad: prioridad || 'NORMAL',
        fecha_radicacion: new Date()
      };

      const plantillaValor = {
        'cite-0': { cite: 'S/C' },
        de: nombreSolicitante,
        para: 'Ventanilla Única de Correspondencia / Pendiente de Derivación',
        ref: referencia,
        institucion: entidad || 'Persona Natural',
        datos_remitente: datosRemitente
      };

      const nuevoDoc = await Documento.create({
        nombre: codigoHR,
        referencia: referencia,
        nombre_plantilla: 'Documento Externo',
        abreviacion: 'DE-A',
        codigo_hoja_ruta: codigoHR,
        origen_radicacion: 'EXTERNA',
        datos_remitente: datosRemitente,
        archivo_adjunto: archivo_adjunto || null,
        plantilla: plantillaDef ? plantillaDef.plantilla : '{"tipo":"documento_externo"}',
        plantilla_valor: JSON.stringify(plantillaValor),
        estado: 'NUEVO',
        clasificacion: 'Reservado',
        _usuario_creacion: 1,
        _usuario_modificacion: 1,
        fecha: new Date()
      });

      // Crear primer paso en Historial de Flujo
      await HistorialFlujo.create({
        id_documento: nuevoDoc.id_documento,
        accion: 'CREADO',
        observacion: `Radicación externa virtual completada. Hoja de Ruta generada: ${codigoHR}`,
        estado: 'ACTIVO',
        _usuario_creacion: 1,
        _usuario_modificacion: 1
      });

      // Enviar correo de confirmación si se facilitó email
      let emailEnviado = false;
      if (email) {
        emailEnviado = await enviarCorreoRadicacion(email, {
          codigo_hoja_ruta: codigoHR,
          remitente: nombreSolicitante,
          referencia: referencia
        });
      }

      res.status(201).send(util.formatearMensaje("EXITO", "Trámite radicado exitosamente.", {
        id_documento: nuevoDoc.id_documento,
        codigo_hoja_ruta: codigoHR,
        fecha: nuevoDoc.fecha,
        remitente: nombreSolicitante,
        referencia: referencia,
        email_notificado: emailEnviado
      }));
    } catch (error) {
      logger.error('Error al radicar trámite en ventanilla virtual:', error);
      res.status(412).send(util.formatearMensaje("ERROR", error.message || error));
    }
  });

  /**
   * GET /api/v1/ventanilla/consultar/:codigo
   * Consulta pública de estado del trámite para el usuario externo.
   */
  app.get('/api/v1/ventanilla/consultar/:codigo', async (req, res) => {
    try {
      const codigo = (req.params.codigo || '').trim();
      if (!codigo) {
        return res.status(400).send(util.formatearMensaje("ERROR", "Código de consulta requerido."));
      }

      const doc = await Documento.findOne({
        where: {
          [Op.or]: [
            { codigo_hoja_ruta: { [Op.iLike]: codigo } },
            { nombre: { [Op.iLike]: codigo } }
          ]
        },
        include: [
          {
            model: HistorialFlujo,
            as: 'historial_flujo',
            order: [['_fecha_creacion', 'DESC']]
          }
        ]
      });

      if (!doc) {
        return res.status(404).send(util.formatearMensaje("INFORMACION", "No se encontró ningún trámite con ese código de Hoja de Ruta."));
      }

      const tieneCiteOficial = doc.nombre && doc.nombre.includes('/') && !doc.nombre.startsWith('HR-');

      res.status(200).send(util.formatearMensaje("EXITO", "Trámite localizado exitosamente.", {
        hoja_ruta: doc.codigo_hoja_ruta || doc.nombre,
        cite_oficial: tieneCiteOficial ? doc.nombre : 'PENDIENTE DE APROBACIÓN (EN TRÁMITE)',
        referencia: doc.referencia,
        remitente: doc.datos_remitente?.remitente || doc.de,
        estado: doc.estado,
        fecha_ingreso: doc.fecha || doc._fecha_creacion,
        origen: doc.origen_radicacion || 'EXTERNA',
        unidad_actual: doc.para || 'Dirección General Ejecutiva / En Trámite',
        historial: doc.historial_flujo || []
      }));
    } catch (error) {
      res.status(412).send(util.formatearMensaje("ERROR", error.message || error));
    }
  });

  /**
   * GET /api/v1/ventanilla/bandeja/:tipo
   * Lista correspondencia en Ventanilla Externa ('externa') o Interna ('interna').
   */
  app.get('/api/v1/ventanilla/bandeja/:tipo', async (req, res) => {
    try {
      const tipo = (req.params.tipo || 'externa').toUpperCase();
      const docs = await Documento.findAll({
        where: {
          origen_radicacion: tipo,
          estado: { [Op.ne]: 'ELIMINADO' }
        },
        order: [['_fecha_creacion', 'DESC']]
      });

      res.status(200).send(util.formatearMensaje("EXITO", `Bandeja de Ventanilla ${tipo} obtenida con éxito.`, {
        total: docs.length,
        resultado: docs
      }));
    } catch (error) {
      res.status(412).send(util.formatearMensaje("ERROR", error.message || error));
    }
  });

  /**
   * POST /api/v1/ventanilla/interna/generar
   * El funcionario de correspondencia genera inmediatamente la Hoja de Ruta en ventanilla física.
   */
  app.post('/api/v1/ventanilla/interna/generar', async (req, res) => {
    try {
      const auditUser = req.body.audit_usuario || {};
      const {
        ci,
        remitente,
        nombreCompleto,
        email,
        telefono,
        entidad,
        tipoTramite,
        citeExterno,
        referencia,
        fojas,
        prioridad
      } = req.body;

      const nombreSolicitante = nombreCompleto || remitente;
      if (!nombreSolicitante || !referencia) {
        return res.status(400).send(util.formatearMensaje("ERROR", "El remitente y la referencia son obligatorios."));
      }

      const anioActual = new Date().getFullYear();
      const codigoHR = await generarCodigoHojaRuta(anioActual, auditUser.id_usuario || 1);

      const datosRemitente = {
        ci: ci || '',
        remitente: nombreSolicitante,
        email: email || '',
        telefono: telefono || '',
        entidad: entidad || '',
        tipoTramite: tipoTramite || 'NOTA_OFICIAL',
        citeExterno: citeExterno || '',
        referencia: referencia,
        fojas: Number(fojas) || 1,
        prioridad: prioridad || 'NORMAL',
        fecha_radicacion: new Date()
      };

      const plantillaDef = await PlantillaFormly.findOne({
        where: { abreviacion: 'DE-A', estado: 'ACTIVO' }
      });

      const nuevoDoc = await Documento.create({
        nombre: codigoHR,
        referencia: referencia,
        nombre_plantilla: 'Documento Externo',
        abreviacion: 'DE-A',
        codigo_hoja_ruta: codigoHR,
        origen_radicacion: 'INTERNA',
        datos_remitente: datosRemitente,
        plantilla: plantillaDef ? plantillaDef.plantilla : '{"tipo":"documento_externo"}',
        plantilla_valor: JSON.stringify({
          'cite-0': { cite: 'S/C' },
          de: nombreSolicitante,
          para: 'Ventanilla Central',
          ref: referencia,
          datos_remitente: datosRemitente
        }),
        estado: 'NUEVO', // Estado preliminar con opción a editar antes de enviar
        clasificacion: 'Reservado',
        _usuario_creacion: auditUser.id_usuario || 1,
        _usuario_modificacion: auditUser.id_usuario || 1,
        fecha: new Date()
      });

      await HistorialFlujo.create({
        id_documento: nuevoDoc.id_documento,
        accion: 'CREADO',
        observacion: `Hoja de Ruta física expedida en Ventanilla Interna: ${codigoHR}`,
        estado: 'ACTIVO',
        _usuario_creacion: auditUser.id_usuario || 1,
        _usuario_modificacion: auditUser.id_usuario || 1
      });

      // Si se proporcionó email, enviar comprobante
      if (email) {
        enviarCorreoRadicacion(email, {
          codigo_hoja_ruta: codigoHR,
          remitente: nombreSolicitante,
          referencia: referencia
        }).catch(e => logger.warn('[Correo Radicación Interna]', e));
      }

      res.status(201).send(util.formatearMensaje("EXITO", "Hoja de Ruta generada exitosamente.", {
        id_documento: nuevoDoc.id_documento,
        codigo_hoja_ruta: codigoHR,
        fecha: nuevoDoc.fecha,
        documento: nuevoDoc
      }));
    } catch (error) {
      res.status(412).send(util.formatearMensaje("ERROR", error.message || error));
    }
  });

  /**
   * PUT /api/v1/ventanilla/interna/:id_documento
   * Editar antes de enviar y cargar/actualizar adjuntos en PDF.
   */
  app.put('/api/v1/ventanilla/interna/:id_documento', async (req, res) => {
    try {
      const idDoc = parseInt(req.params.id_documento, 10);
      const auditUser = req.body.audit_usuario || {};
      const {
        remitente,
        ci,
        email,
        telefono,
        entidad,
        citeExterno,
        referencia,
        fojas,
        prioridad,
        archivo_adjunto
      } = req.body;

      const doc = await Documento.findByPk(idDoc);
      if (!doc) {
        return res.status(404).send(util.formatearMensaje("ERROR", "Documento no encontrado."));
      }

      const datosRemitenteAct = {
        ...(doc.datos_remitente || {}),
        ci: ci !== undefined ? ci : doc.datos_remitente?.ci,
        remitente: remitente || doc.datos_remitente?.remitente,
        email: email !== undefined ? email : doc.datos_remitente?.email,
        telefono: telefono !== undefined ? telefono : doc.datos_remitente?.telefono,
        entidad: entidad !== undefined ? entidad : doc.datos_remitente?.entidad,
        citeExterno: citeExterno !== undefined ? citeExterno : doc.datos_remitente?.citeExterno,
        referencia: referencia || doc.datos_remitente?.referencia,
        fojas: fojas !== undefined ? Number(fojas) : doc.datos_remitente?.fojas,
        prioridad: prioridad || doc.datos_remitente?.prioridad
      };

      await doc.update({
        referencia: referencia || doc.referencia,
        datos_remitente: datosRemitenteAct,
        archivo_adjunto: archivo_adjunto || doc.archivo_adjunto,
        _usuario_modificacion: auditUser.id_usuario || 1
      });

      res.status(200).send(util.formatearMensaje("EXITO", "Documento actualizado correctamente antes de enviar.", doc));
    } catch (error) {
      res.status(412).send(util.formatearMensaje("ERROR", error.message || error));
    }
  });

  /**
   * GET /api/v1/ventanilla/jefes
   * Obtiene la lista de usuarios oficiales con ROL JEFE (o MAE) y su unidad.
   */
  app.get('/api/v1/ventanilla/jefes', async (req, res) => {
    try {
      const jefes = await Usuario.findAll({
        where: { estado: 'ACTIVO' },
        include: [
          {
            model: UsuarioRol,
            as: 'usuario_rol',
            where: { fid_rol: 2, estado: 'ACTIVO' },
            include: [{ model: Rol, as: 'rol' }]
          },
          {
            model: Unidad,
            as: 'unidad'
          }
        ],
        order: [['nombres', 'ASC']]
      });

      res.status(200).send(util.formatearMensaje("EXITO", "Jefes de unidad obtenidos con éxito.", jefes));
    } catch (error) {
      res.status(412).send(util.formatearMensaje("ERROR", error.message || error));
    }
  });

  /**
   * POST /api/v1/ventanilla/derivar/:id_documento
   * Derivar documento a un Jefe de Unidad específico o directamente a la MAE.
   * Va AÚN SIN CITE (con su código de Hoja de Ruta).
   */
  app.post('/api/v1/ventanilla/derivar/:id_documento', async (req, res) => {
    try {
      const idDoc = parseInt(req.params.id_documento, 10);
      const auditUser = req.body.audit_usuario || {};
      const {
        tipo_destino, // 'MAE' o 'UNIDAD'
        id_usuario_destino,
        fid_unidad_destino,
        proveido,
        prioridad
      } = req.body;

      const doc = await Documento.findByPk(idDoc);
      if (!doc) {
        return res.status(404).send(util.formatearMensaje("ERROR", "Documento no encontrado."));
      }

      let usuarioDestino = null;
      let unidadNombre = 'Dirección General Ejecutiva (MAE)';

      if (tipo_destino === 'MAE') {
        // Buscar MAE oficial
        usuarioDestino = await Usuario.findOne({
          where: {
            [Op.or]: [
              { es_mae: true },
              { cargo: { [Op.iLike]: '%director%' } }
            ],
            estado: 'ACTIVO'
          }
        }) || await Usuario.findByPk(1);
        unidadNombre = 'Dirección General Ejecutiva (MAE)';
      } else if (id_usuario_destino) {
        // Buscar por el Jefe de Unidad seleccionado
        usuarioDestino = await Usuario.findByPk(id_usuario_destino, {
          include: [{ model: Unidad, as: 'unidad' }]
        });
        if (usuarioDestino && usuarioDestino.unidad) {
          unidadNombre = usuarioDestino.unidad.nombre;
        } else if (fid_unidad_destino) {
          const un = await Unidad.findByPk(fid_unidad_destino);
          if (un) unidadNombre = un.nombre;
        }
      } else if (fid_unidad_destino) {
        // Buscar Unidad y su Jefe
        const un = await Unidad.findByPk(fid_unidad_destino);
        if (un) unidadNombre = un.nombre;

        usuarioDestino = await Usuario.findOne({
          where: { fid_unidad: fid_unidad_destino, estado: 'ACTIVO' }
        }) || await Usuario.findByPk(1);
      }

      const nombreDestino = usuarioDestino 
        ? `${usuarioDestino.nombres} ${usuarioDestino.apellidos || ''}`.trim() 
        : unidadNombre;

      const cargoDestino = usuarioDestino?.cargo ? ` (${usuarioDestino.cargo})` : '';

      // Actualizar documento: estado DERIVADO, aún sin CITE
      await doc.update({
        estado: 'DERIVADO',
        para: `${nombreDestino}${cargoDestino} - ${unidadNombre}`,
        firmante_actual: usuarioDestino ? usuarioDestino.id_usuario : 1,
        observaciones: proveido || 'Para su revisión y trámite correspondiente',
        _usuario_modificacion: auditUser.id_usuario || 1
      });

      // Registrar paso en Historial de Flujo
      await HistorialFlujo.create({
        id_documento: doc.id_documento,
        accion: 'DERIVADO',
        observacion: `Derivado a ${unidadNombre} (${nombreDestino}): ${proveido || 'Conforme a competencias'}`,
        estado: 'ACTIVO',
        _usuario_creacion: auditUser.id_usuario || 1,
        _usuario_modificacion: usuarioDestino ? usuarioDestino.id_usuario : 1
      });

      res.status(200).send(util.formatearMensaje("EXITO", `Trámite ${doc.codigo_hoja_ruta} derivado exitosamente a ${unidadNombre} (${nombreDestino}) (aún sin CITE).`, {
        id_documento: doc.id_documento,
        hoja_ruta: doc.codigo_hoja_ruta,
        destino: unidadNombre,
        destinatario: nombreDestino
      }));
    } catch (error) {
      res.status(412).send(util.formatearMensaje("ERROR", error.message || error));
    }
  });

  /**
   * POST /api/v1/ventanilla/aprobar/:id_documento
   * Jefe de Unidad o MAE aprueba el documento: en este momento se genera el CITE Oficial (DE-A)
   * conservando internamente el código de hoja de ruta.
   */
  app.post('/api/v1/ventanilla/aprobar/:id_documento', async (req, res) => {
    try {
      const idDoc = parseInt(req.params.id_documento, 10);
      const auditUser = req.body.audit_usuario || {};

      const doc = await Documento.findByPk(idDoc);
      if (!doc) {
        return res.status(404).send(util.formatearMensaje("ERROR", "Documento no encontrado."));
      }

      // Obtener unidad del aprobador
      let abrevUnidad = 'DGE';
      if (auditUser.fid_unidad) {
        const un = await Unidad.findByPk(auditUser.fid_unidad);
        if (un && un.abreviacion) abrevUnidad = un.abreviacion;
      }

      const anioActual = new Date().getFullYear();
      const citeOficial = await generarCiteDocumentoExterno(abrevUnidad, anioActual, auditUser.id_usuario || 1);

      // El documento adopta su CITE oficial interno con la nomenclatura Documento Externo (DE-A),
      // conservando permanentemente su código de hoja de ruta
      await doc.update({
        nombre: citeOficial,
        nombre_plantilla: 'Documento Externo',
        abreviacion: 'DE-A',
        estado: 'APROBADO',
        _usuario_modificacion: auditUser.id_usuario || 1
      });

      // Registrar aprobación en Historial de Flujo
      await HistorialFlujo.create({
        id_documento: doc.id_documento,
        accion: 'APROBADO',
        observacion: `Documento aprobado oficialmente. CITE asignado: ${citeOficial}. Hoja de Ruta vinculada: ${doc.codigo_hoja_ruta}`,
        estado: 'ACTIVO',
        _usuario_creacion: auditUser.id_usuario || 1,
        _usuario_modificacion: auditUser.id_usuario || 1
      });

      res.status(200).send(util.formatearMensaje("EXITO", `Documento aprobado con éxito. CITE generado: ${citeOficial}`, {
        id_documento: doc.id_documento,
        cite: citeOficial,
        codigo_hoja_ruta: doc.codigo_hoja_ruta,
        estado: 'APROBADO'
      }));
    } catch (error) {
      res.status(412).send(util.formatearMensaje("ERROR", error.message || error));
    }
  });
};
