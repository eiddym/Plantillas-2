'use strict';

const loteBL = require('../../bl/plantillasFormly/loteBL');

module.exports = app => {
  const Documento = app.src.db.models.documento;
  const HistorialFlujo = app.src.db.models.historial_flujo;
  const Usuario = app.src.db.models.usuario;
  const Unidad = app.src.db.models.unidad;
  const util = app.src.lib.util;
  const Op = app.src.db.Sequelize.Op;

  /**
   * GET /api/v1/archivo/general
   * Obtiene todos los documentos cerrados organizados por Unidad jerárquica y tipos dinámicos.
   */
  app.get('/api/v1/archivo/general', async (req, res) => {
    try {
      // 1. Obtener todas las unidades activas
      const unidades = await Unidad.findAll({
        where: { estado: 'ACTIVO' },
        order: [['nombre', 'ASC']]
      });

      // 2. Obtener todos los documentos cerrados con CITE
      const docs = await Documento.findAll({
        where: {
          estado: 'CERRADO',
          nombre: { [Op.like]: '%/%' }
        },
        include: [
          {
            model: Usuario,
            as: 'usuario_creacion',
            attributes: ['id_usuario', 'nombres', 'apellidos', 'cargo', 'fid_unidad'],
            include: [{ model: Unidad, as: 'unidad', attributes: ['id_unidad', 'nombre', 'abreviacion'] }]
          }
        ],
        order: [['_fecha_creacion', 'DESC']]
      });

      // 3. Extraer tipos de documentos realmente existentes de forma dinámica
      const tiposSet = new Set();
      docs.forEach(d => {
        const tipo = d.nombre_plantilla || 'Documento Oficial';
        if (tipo && tipo.trim()) {
          tiposSet.add(tipo.trim());
        }
      });
      const tiposDisponibles = Array.from(tiposSet).sort();

      // 4. Mapear documentos por cada unidad (aunque no tenga archivos)
      const resultadoUnidades = unidades.map(u => {
        const uPlain = u.toJSON();
        const docsUnidad = docs.filter(d => d.usuario_creacion && d.usuario_creacion.fid_unidad === u.id_unidad);
        
        // Agrupar documentos de esta unidad por tipo
        const agrupadoPorTipo = {};
        docsUnidad.forEach(d => {
          const t = d.nombre_plantilla || 'Documento Oficial';
          if (!agrupadoPorTipo[t]) agrupadoPorTipo[t] = [];
          agrupadoPorTipo[t].push(d);
        });

        uPlain.total_documentos = docsUnidad.length;
        uPlain.documentos = docsUnidad;
        uPlain.agrupado_por_tipo = agrupadoPorTipo;
        return uPlain;
      });

      res.status(200).send(util.formatearMensaje("EXITO", "Archivo general obtenido exitosamente.", {
        total_documentos: docs.length,
        tipos_disponibles: tiposDisponibles,
        unidades: resultadoUnidades,
        documentos: docs
      }));
    } catch (error) {
      res.status(412).send(util.formatearMensaje("ERROR", error.message || error));
    }
  });

  /**
   * GET /api/v1/archivo/unidad/:id_unidad
   * Obtiene el archivo de una unidad específica y sus sub-unidades dependientes.
   */
  app.get('/api/v1/archivo/unidad/:id_unidad', async (req, res) => {
    try {
      const idUnidad = parseInt(req.params.id_unidad, 10);
      if (isNaN(idUnidad)) {
        return res.status(400).send(util.formatearMensaje("ERROR", "ID de unidad inválido."));
      }

      const unidadPrincipal = await Unidad.findByPk(idUnidad);
      if (!unidadPrincipal) {
        return res.status(404).send(util.formatearMensaje("ERROR", "Unidad no encontrada."));
      }

      // Sub-unidades dependientes
      const subUnidades = await Unidad.findAll({
        where: { fid_unidad_padre: idUnidad, estado: 'ACTIVO' },
        order: [['nombre', 'ASC']]
      });

      const todasUnidadesIds = [idUnidad, ...subUnidades.map(s => s.id_unidad)];

      // Documentos de los funcionarios de esta unidad y sub-unidades
      const docs = await Documento.findAll({
        where: {
          estado: 'CERRADO',
          nombre: { [Op.like]: '%/%' }
        },
        include: [
          {
            model: Usuario,
            as: 'usuario_creacion',
            attributes: ['id_usuario', 'nombres', 'apellidos', 'cargo', 'fid_unidad'],
            where: { fid_unidad: { [Op.in]: todasUnidadesIds } },
            include: [{ model: Unidad, as: 'unidad', attributes: ['id_unidad', 'nombre', 'abreviacion'] }]
          }
        ],
        order: [['_fecha_creacion', 'DESC']]
      });

      // Extraer tipos dinámicos de esta unidad
      const tiposSet = new Set();
      docs.forEach(d => {
        const tipo = d.nombre_plantilla || 'Documento Oficial';
        tiposSet.add(tipo.trim());
      });

      // Documentos propios de la unidad principal
      const docsPropios = docs.filter(d => d.usuario_creacion.fid_unidad === idUnidad);
      const propiosPorTipo = {};
      docsPropios.forEach(d => {
        const t = d.nombre_plantilla || 'Documento Oficial';
        if (!propiosPorTipo[t]) propiosPorTipo[t] = [];
        propiosPorTipo[t].push(d);
      });

      // Mapear sub-unidades dependientes con sus propios documentos
      const subUnidadesMapeadas = subUnidades.map(sub => {
        const subPlain = sub.toJSON();
        const subDocs = docs.filter(d => d.usuario_creacion.fid_unidad === sub.id_unidad);
        const subPorTipo = {};
        subDocs.forEach(d => {
          const t = d.nombre_plantilla || 'Documento Oficial';
          if (!subPorTipo[t]) subPorTipo[t] = [];
          subPorTipo[t].push(d);
        });
        subPlain.documentos = subDocs;
        subPlain.agrupado_por_tipo = subPorTipo;
        subPlain.total_documentos = subDocs.length;
        return subPlain;
      });

      res.status(200).send(util.formatearMensaje("EXITO", "Archivo de unidad obtenido exitosamente.", {
        unidad: unidadPrincipal,
        total_documentos: docsPropios.length,
        tipos_disponibles: Array.from(tiposSet).sort(),
        documentos_propios: docsPropios,
        agrupado_por_tipo: propiosPorTipo,
        sub_unidades: subUnidadesMapeadas
      }));
    } catch (error) {
      res.status(412).send(util.formatearMensaje("ERROR", error.message || error));
    }
  });

  /**
   * GET /api/v1/archivo/institucional
   * Retorna ÚNICAMENTE los documentos declarados como Institucionales.
   */
  app.get('/api/v1/archivo/institucional', async (req, res) => {
    try {
      const docs = await Documento.findAll({
        where: {
          es_institucional: true,
          estado: { [Op.ne]: 'ELIMINADO' }
        },
        include: [
          {
            model: Usuario,
            as: 'usuario_creacion',
            attributes: ['id_usuario', 'nombres', 'apellidos', 'cargo', 'fid_unidad'],
            include: [{ model: Unidad, as: 'unidad', attributes: ['id_unidad', 'nombre', 'abreviacion'] }]
          }
        ],
        order: [['_fecha_creacion', 'DESC']]
      });

      res.status(200).send(util.formatearMensaje("EXITO", "Documentos de archivo institucional obtenidos exitosamente.", {
        total: docs.length,
        resultado: docs
      }));
    } catch (error) {
      res.status(412).send(util.formatearMensaje("ERROR", error.message || error));
    }
  });

  /**
   * POST /api/v1/archivo/promover/:id_documento
   * Jefe de unidad o MAE promueve un documento a Archivo Institucional.
   */
  app.post('/api/v1/archivo/promover/:id_documento', async (req, res) => {
    try {
      const idDoc = parseInt(req.params.id_documento, 10);
      const auditUser = req.body.audit_usuario || {};

      const doc = await Documento.findByPk(idDoc);
      if (!doc) {
        return res.status(404).send(util.formatearMensaje("ERROR", "Documento no encontrado."));
      }

      const versionInicial = (doc.versiones && doc.versiones.length > 0) ? doc.versiones : [
        {
          version: 1,
          nombre_archivo: `${doc.nombre}.pdf`,
          ruta: `/api/v1/documento/${doc.id_documento}/pdf`,
          fecha: doc._fecha_creacion || new Date(),
          usuario: auditUser.nombres || 'Autor Original',
          observacion: 'Versión original de flujo aprobada y cerrada'
        }
      ];

      await doc.update({
        es_institucional: true,
        categoria_institucional: req.body.categoria || doc.nombre_plantilla || 'Resolución / Normativa',
        versiones: versionInicial,
        _usuario_modificacion: auditUser.id_usuario || 1
      });

      res.status(200).send(util.formatearMensaje("EXITO", "Documento promovido a Archivo Institucional con éxito.", doc));
    } catch (error) {
      res.status(412).send(util.formatearMensaje("ERROR", error.message || error));
    }
  });

  /**
   * POST /api/v1/archivo/institucional/cargar
   * Solo ADMIN o MAE carga directamente un documento institucional.
   */
  app.post('/api/v1/archivo/institucional/cargar', async (req, res) => {
    try {
      const { cite, referencia, categoria, nombre_archivo, url_archivo, observacion } = req.body;
      const auditUser = req.body.audit_usuario || {};

      if (!cite || !referencia) {
        return res.status(400).send(util.formatearMensaje("ERROR", "CITE y Referencia son obligatorios."));
      }

      const versiones = [
        {
          version: 1,
          nombre_archivo: nombre_archivo || `${cite}.pdf`,
          ruta: url_archivo || `/public/documentos/${cite}.pdf`,
          fecha: new Date(),
          usuario: `${auditUser.nombres || 'Administrador'}`,
          observacion: observacion || 'Carga inicial en archivo institucional'
        }
      ];

      const nuevoDoc = await Documento.create({
        nombre: cite,
        referencia: referencia,
        nombre_plantilla: categoria || 'Documento Institucional',
        categoria_institucional: categoria || 'Normativa y Políticas',
        plantilla: '{"tipo": "institucional"}',
        plantilla_valor: JSON.stringify({ ref: referencia, cite: cite, observacion }),
        estado: 'CERRADO',
        es_institucional: true,
        versiones: versiones,
        _usuario_creacion: auditUser.id_usuario || 1,
        _usuario_modificacion: auditUser.id_usuario || 1,
        fecha: new Date()
      });

      res.status(201).send(util.formatearMensaje("EXITO", "Documento institucional cargado exitosamente.", nuevoDoc));
    } catch (error) {
      res.status(412).send(util.formatearMensaje("ERROR", error.message || error));
    }
  });

  /**
   * POST /api/v1/archivo/versionar/:id_documento
   * Agrega una nueva versión a un documento en custodia (v1 -> v2...), manteniendo la trazabilidad histórica.
   */
  app.post('/api/v1/archivo/versionar/:id_documento', async (req, res) => {
    try {
      const idDoc = parseInt(req.params.id_documento, 10);
      const { observacion, nombre_archivo, url_archivo } = req.body;
      const auditUser = req.body.audit_usuario || {};

      const doc = await Documento.findByPk(idDoc);
      if (!doc) {
        return res.status(404).send(util.formatearMensaje("ERROR", "Documento no encontrado."));
      }

      let listaVersiones = Array.isArray(doc.versiones) ? [...doc.versiones] : [];
      if (listaVersiones.length === 0) {
        listaVersiones.push({
          version: 1,
          nombre_archivo: `${doc.nombre}_v1.pdf`,
          ruta: `/api/v1/documento/${doc.id_documento}/pdf`,
          fecha: doc._fecha_creacion || new Date(),
          usuario: 'Autor Original',
          observacion: 'Versión original de archivo'
        });
      }

      const siguienteVersion = listaVersiones.length + 1;
      const nuevaVersion = {
        version: siguienteVersion,
        nombre_archivo: nombre_archivo || `${doc.nombre}_v${siguienteVersion}.pdf`,
        ruta: url_archivo || `/api/v1/documento/${doc.id_documento}/pdf?v=${siguienteVersion}`,
        fecha: new Date(),
        usuario: `${auditUser.nombres || 'Funcionario'} ${auditUser.apellidos || ''}`.trim(),
        observacion: observacion || `Nueva versión v${siguienteVersion} digitalizada`
      };

      listaVersiones.push(nuevaVersion);

      await doc.update({
        versiones: listaVersiones,
        _usuario_modificacion: auditUser.id_usuario || 1
      });

      res.status(200).send(util.formatearMensaje("EXITO", `Versión v${siguienteVersion} agregada con éxito a la trazabilidad.`, {
        id_documento: doc.id_documento,
        total_versiones: listaVersiones.length,
        versiones: listaVersiones
      }));
    } catch (error) {
      res.status(412).send(util.formatearMensaje("ERROR", error.message || error));
    }
  });

  /**
   * GET /api/v1/plantillasFormly/archivo/expediente/:id
   */
  app.get('/api/v1/plantillasFormly/archivo/expediente/:id', (req, res) => {
    const idParam = parseInt(req.params.id, 10);
    if (isNaN(idParam)) {
      return res.status(400).send(util.formatearMensaje("ERROR", "Identificador de documento o lote inválido."));
    }

    loteBL.obtenerExpedienteLote(Documento, HistorialFlujo, Usuario, Unidad, idParam)
      .then(expediente => {
        if (!expediente) {
          return res.status(404).send(util.formatearMensaje("INFORMACION", "No se encontró el expediente de trámite."));
        }
        res.status(200).send(util.formatearMensaje("EXITO", "Expediente de trámite obtenido correctamente.", expediente));
      })
      .catch(error => {
        res.status(412).send(util.formatearMensaje("ERROR", error.message || error));
      });
  });

  /**
   * POST /api/v1/plantillasFormly/archivo/procesar_lote
   */
  app.post('/api/v1/plantillasFormly/archivo/procesar_lote', (req, res) => {
    const { id_documento, documento_padre, cites_referidos } = req.body;
    if (!id_documento) {
      return res.status(400).send(util.formatearMensaje("ERROR", "id_documento es requerido."));
    }

    loteBL.procesarLote(Documento, id_documento, documento_padre, cites_referidos)
      .then(resultado => {
        res.status(200).send(util.formatearMensaje("EXITO", "Lote procesado y fusionado correctamente.", resultado));
      })
      .catch(error => {
        res.status(412).send(util.formatearMensaje("ERROR", error.message || error));
      });
  });
};
