const sequelizeHandlers = require("../../lib/crudHandler");
const sequelizeFormly = require("../../lib/modelToFormly");
const Sequelize = require("sequelize");
const fs = require("fs");
const _ = require('lodash');
const logger = require('../../lib/logger');


module.exports = app => {
  const modelPartida = app.src.db.models.partida;
  const modelDocumento = app.src.db.models.documento;
  const util = require('../../lib/util');
  const moment = require('moment');
  const Op = app.src.db.Sequelize.Op;

  /**
  @apiVersion 2.0.0
  @apiGroup Presupuesto
  @apiName Get presupuesto/resumen
  @api {get} /api/v1/presupuesto/resumen?partidas= Obtiene resumen de las partidas

  @apiDescription Get presupuesto/resumen?partidas=, obtiene el resumen de las partidas dadas

  @apiParam (Query) {Array} partidas Array de partidas expresadas como texto

  @apiSuccess (Respuesta) {Texto} partida Identificador de la partida
  @apiSuccess (Respuesta) {Integer} monto Cantidad consignada como monto
  @apiSuccess (Respuesta) {Integer} comprometido Cantidad consignada como comprometido
  @apiSuccess (Respuesta) {Integer} pagado Cantidad consignada como pagado
  @apiSuccess (Respuesta) {Integer} saldo Cantidad consignada como saldo
  @apiSuccess (Respuesta) {Integer} total Cantidad consignada como total

  @apiSuccessExample {json} Respuesta:
  HTTP/1.1 200 OK
  {
    "tipoMensaje": "EXITO",
    "mensaje": "Obtención de datos exitosa.",
    "datos": [
      {
        "partida": "120",
        "monto": 0,
        "comprometido": 12000,
        "pagado": 12000,
        "saldo": 0,
        "total": 12000
      },
      {
        "partida": "1145",
        "monto": 0,
        "comprometido": 8830,
        "pagado": 1000,
        "saldo": 0,
        "total": 10200
      }
    ]
  }
*/
  const presupuestoService = require('../../services/presupuestoService');

  app.get('/api/v1/presupuesto/resumen', (req, res) => {
    let partidas = [];
    try {
      if (req.query.partidas) {
        partidas = typeof req.query.partidas === 'string' && req.query.partidas.startsWith('[')
          ? JSON.parse(req.query.partidas)
          : [req.query.partidas];
      }
    } catch (e) {
      partidas = [req.query.partidas];
    }

    const gestion = req.query.gestion || `${moment().tz("America/La_Paz").year()}`;

    presupuestoService.obtenerResumenPartidas(modelPartida, Op, partidas, gestion)
      .then(procesado => {
        if (procesado && procesado.length > 0) {
          res.status(200).send(util.formatearMensaje('EXITO', 'Obtención de datos exitosa.', procesado));
        } else {
          res.status(200).send(util.formatearMensaje('INFORMACION', 'No existe resumen para las partidas especificadas.', []));
        }
      })
      .catch(error => {
        logger.error('[PRESUPUESTO RESUMEN] Error en la búsqueda de partidas:', error);
        res.status(200).send(util.formatearMensaje('INFORMACION', 'No existe resumen.', []));
      });
  });

};
