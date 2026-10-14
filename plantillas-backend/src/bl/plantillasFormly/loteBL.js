'use strict';

const Promise = require('bluebird');
const Op = require('sequelize').Op;

module.exports = {
  /**
   * Procesa y asigna el lote_id y raiz_cite a un documento.
   * Fusiona lotes si el documento referencia o deriva de otros documentos.
   *
   * @param {Modelo} Documento Modelo Sequelize de documento
   * @param {Number} pIdDocumento ID del documento actual
   * @param {Number} pDocumentoPadreId ID del documento padre (si existe)
   * @param {Array} pCitesReferidos IDs o CITEs referenciados (opcional)
   * @param {Object} t Transacción Sequelize (opcional)
   */
  procesarLote: (Documento, pIdDocumento, pDocumentoPadreId = null, pCitesReferidos = [], t = null) => {
    const options = t ? { transaction: t } : {};

    return new Promise(async (resolve, reject) => {
      try {
        const docActual = await Documento.findByPk(pIdDocumento, options);
        if (!docActual) return resolve(null);

        let loteIdFinal = docActual.lote_id || docActual.id_documento;
        let raizCiteFinal = docActual.raiz_cite || docActual.id_documento;
        const lotesAMergear = new Set([loteIdFinal]);

        // 1. Si existe padre, tomar lote y raíz del padre
        if (pDocumentoPadreId) {
          const docPadre = await Documento.findByPk(pDocumentoPadreId, options);
          if (docPadre) {
            if (docPadre.lote_id) lotesAMergear.add(docPadre.lote_id);
            if (docPadre.raiz_cite) raizCiteFinal = docPadre.raiz_cite;
          }
        }

        // 2. Si existen CITEs o IDs referenciados, recopilar sus lotes
        if (Array.isArray(pCitesReferidos) && pCitesReferidos.length > 0) {
          const idsReferidos = pCitesReferidos
            .map(id => parseInt(id, 10))
            .filter(id => !isNaN(id) && id !== pIdDocumento);

          if (idsReferidos.length > 0) {
            const docsReferidos = await Documento.findAll({
              where: { id_documento: { [Op.in]: idsReferidos } },
              attributes: ['id_documento', 'lote_id', 'raiz_cite'],
              ...options
            });

            docsReferidos.forEach(ref => {
              if (ref.lote_id) lotesAMergear.add(ref.lote_id);
            });
          }
        }

        // 3. El lote con menor ID gana (o el del padre/raíz)
        const listaLotes = Array.from(lotesAMergear);
        loteIdFinal = Math.min(...listaLotes);

        // 4. Si hay múltiples lotes, fusionar todos al loteIdFinal
        if (listaLotes.length > 1) {
          await Documento.update(
            { lote_id: loteIdFinal },
            {
              where: { lote_id: { [Op.in]: listaLotes } },
              ...options
            }
          );
        }

        // 5. Actualizar el documento actual con su lote_id y raiz_cite finales
        await docActual.update({
          lote_id: loteIdFinal,
          raiz_cite: raizCiteFinal,
          cites_referidos: pCitesReferidos || []
        }, options);

        resolve({ lote_id: loteIdFinal, raiz_cite: raizCiteFinal });
      } catch (error) {
        reject(error);
      }
    });
  },

  /**
   * Obtiene la vista de "Archivo / Expediente Completo" para un lote_id o id_documento.
   *
   * @param {Modelo} Documento Modelo de Documento
   * @param {Modelo} HistorialFlujo Modelo de HistorialFlujo
   * @param {Modelo} Usuario Modelo de Usuario
   * @param {Modelo} Unidad Modelo de Unidad
   * @param {Number} pIdDocumentoOLote ID del documento o ID del lote
   */
  obtenerExpedienteLote: (Documento, HistorialFlujo, Usuario, Unidad, pIdDocumentoOLote) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Buscar primero el documento para obtener su lote_id
        const docBase = await Documento.findByPk(pIdDocumentoOLote);
        const targetLoteId = docBase ? (docBase.lote_id || docBase.id_documento) : pIdDocumentoOLote;

        // Obtener todos los documentos pertenecientes a este lote
        const documentosLote = await Documento.findAll({
          where: { lote_id: targetLoteId },
          order: [['_fecha_creacion', 'ASC']],
          include: [
            {
              model: HistorialFlujo,
              as: 'historial_flujo',
              required: false
            }
          ]
        });

        if (!documentosLote || documentosLote.length === 0) {
          return resolve(null);
        }

        // Extraer estadísticas y resumen del lote
        const idsUsuarios = new Set();
        documentosLote.forEach(doc => {
          if (doc._usuario_creacion) idsUsuarios.add(doc._usuario_creacion);
        });

        const usuarios = await Usuario.findAll({
          where: { id_usuario: { [Op.in]: Array.from(idsUsuarios) } },
          attributes: ['id_usuario', 'nombres', 'apellidos', 'usuario', 'cargo', 'fid_unidad'],
          include: [{ model: Unidad, as: 'unidad', attributes: ['id_unidad', 'nombre', 'abreviacion'] }]
        });

        const mapaUsuarios = {};
        usuarios.forEach(u => { mapaUsuarios[u.id_usuario] = u; });

        const docRaiz = documentosLote.find(d => d.id_documento === documentosLote[0].raiz_cite) || documentosLote[0];

        // Construir respuesta estructurada
        const expediente = {
          lote_id: targetLoteId,
          raiz: {
            id_documento: docRaiz.id_documento,
            nombre: docRaiz.nombre,
            nombre_plantilla: docRaiz.nombre_plantilla,
            fecha_creacion: docRaiz._fecha_creacion
          },
          total_documentos: documentosLote.length,
          estado_lote: documentosLote.some(d => d.estado === 'ENVIADO' || d.estado === 'DERIVADO') ? 'EN_TRAMITE' : 'CERRADO',
          documentos: documentosLote.map(d => ({
            id_documento: d.id_documento,
            nombre: d.nombre,
            nombre_plantilla: d.nombre_plantilla,
            abreviacion: d.abreviacion,
            referencia: d.referencia,
            estado: d.estado,
            documento_padre: d.documento_padre,
            lote_id: d.lote_id,
            cites_referidos: d.cites_referidos,
            fecha_creacion: d._fecha_creacion,
            creador: mapaUsuarios[d._usuario_creacion] ? {
              nombre_completo: `${mapaUsuarios[d._usuario_creacion].nombres} ${mapaUsuarios[d._usuario_creacion].apellidos}`,
              cargo: mapaUsuarios[d._usuario_creacion].cargo,
              unidad: mapaUsuarios[d._usuario_creacion].unidad ? mapaUsuarios[d._usuario_creacion].unidad.nombre : null
            } : null,
            historial: d.historial_flujo
          }))
        };

        resolve(expediente);
      } catch (error) {
        reject(error);
      }
    });
  }
};
