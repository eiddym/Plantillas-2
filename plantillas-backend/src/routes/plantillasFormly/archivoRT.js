'use strict';

const loteBL = require('../../bl/plantillasFormly/loteBL');

module.exports = app => {
  const Documento = app.src.db.models.documento;
  const HistorialFlujo = app.src.db.models.historial_flujo;
  const Usuario = app.src.db.models.usuario;
  const Unidad = app.src.db.models.unidad;
  const util = app.src.lib.util;

  /**
   * GET /api/v1/plantillasFormly/archivo/expediente/:id
   * Obtiene la vista unificada del lote/expediente completo para un CITE o lote_id.
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
   * Asocia o fusiona manualmente un documento con otros CITEs referenciados.
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
