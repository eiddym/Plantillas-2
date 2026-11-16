
module.exports = app => {
  const partida = app.src.db.models.partida;
  const documento = app.src.db.models.documento;
  const util = require('../../lib/util');
  const moment = require('moment');
  //const sequelize = require('sequelize');
  const Promise = require('bluebird');

  const config = app.src.config.config;
  const sequelize = app.src.db.sequelize;
        // final = moment(`${req.query.final}`, 'YYYY-MM-DD').tz('America/La_Paz').format(),

/**
  @apiVersion 2.0.0
  @apiGroup Monitoreo
  @apiName Get estados
  @api {get} /api/v1/monitoreo/estados?fechaInicial=&fechaFinal= Obtiene lista de estados de documento por usuario

  @apiDescription Get estados, Obtiene la lista de documentos por estado y usuario desde una fecha inicial a otra final

  @apiParam (Query) {Texto} fechaInicial Fecha y hora desde la que se desea el reporte
  @apiParam (Query) {Texto} fechaFinal Fecha y hora hasta la que se desea el reporte
  
  @apiSuccess (Respuesta) {Texto} _usuario_creacion Usuario
  @apiSuccess (Respuesta) {Texto} nombres Nombres del usuario
  @apiSuccess (Respuesta) {Texto} apellidos Apellios del usuario
  @apiSuccess (Respuesta) {Texto} CREADO Total creados
  @apiSuccess (Respuesta) {Texto} ENVIADO Total enviados
  @apiSuccess (Respuesta) {Texto} DERIVADO Total derivados
  @apiSuccess (Respuesta) {Texto} APROBADO Total aprobados
  @apiSuccess (Respuesta) {Texto} RECHAZADO Total rechazados
  @apiSuccess (Respuesta) {Texto} CERRADO Total cerrados
  @apiSuccess (Respuesta) {Texto} ELIMINADO Total eliminados

  @apiSuccessExample {json} Respuesta:
  HTTP/1.1 200 OK
  {
      "tipoMensaje": "EXITO",
      "mensaje": "Obtención de datos exitosa.",
      "datos": [
        {
          "_usuario_creacion": 4,
          "nombres": "Juana",
          "apellidos": "Arco",
          "CREADO": null,
          "ENVIADO": 2,
          "DERIVADO": null,
          "APROBADO": null,
          "RECHAZADO": null,
          "CERRADO": null,
          "ELIMINADO": null
        },
        {
          "_usuario_creacion": 3,
          "nombres": "Juan",
          "apellidos": "Perez",
          "CREADO": null,
          "ENVIADO": 1,
          "DERIVADO": null,
          "APROBADO": null,
          "RECHAZADO": null,
          "CERRADO": null,
          "ELIMINADO": null
        }
        ...
      ]
  }
  @apiSampleRequest off
*/

  app.get('/api/v1/monitoreo/estados', async (req, res) => {
    try {
      if (isNaN(new Date(req.query.fechaInicial))) {
        return res.status(412).send(util.formatearMensaje('ERROR', 'La fecha de inicio no tiene un formato correcto!'));
      }
      if (isNaN(new Date(req.query.fechaFinal))) {
        return res.status(412).send(util.formatearMensaje('ERROR', 'La fecha final no tiene un formato correcto!'));
      }

      const _fechaInicial = moment(req.query.fechaInicial).format('YYYY-MM-DD');
      const _fechaFinal = moment(req.query.fechaFinal).format('YYYY-MM-DD');
      const idUnidadRaw = req.query.id_unidad || req.query.fid_unidad;
      const idUnidad = (idUnidadRaw && !isNaN(parseInt(idUnidadRaw, 10))) ? parseInt(idUnidadRaw, 10) : null;

      const replacements = { fechaInicial: _fechaInicial, fechaFinal: _fechaFinal };
      let filtroUnidad = '';
      if (idUnidad !== null) {
        filtroUnidad = 'AND u.fid_unidad = :idUnidad';
        replacements.idUnidad = idUnidad;
      }

      const qryUsuarios = `
        SELECT
          u.id_usuario AS _usuario_creacion,
          u.nombres,
          u.apellidos,
          COUNT(h.id_historial_flujo) FILTER (WHERE h.accion = 'CREADO') AS "CREADO",
          COUNT(h.id_historial_flujo) FILTER (WHERE h.accion = 'ENVIADO') AS "ENVIADO",
          COUNT(h.id_historial_flujo) FILTER (WHERE h.accion = 'DERIVADO') AS "DERIVADO",
          COUNT(h.id_historial_flujo) FILTER (WHERE h.accion = 'APROBADO') AS "APROBADO",
          COUNT(h.id_historial_flujo) FILTER (WHERE h.accion = 'RECHAZADO') AS "RECHAZADO",
          COUNT(h.id_historial_flujo) FILTER (WHERE h.accion = 'CERRADO') AS "CERRADO",
          COUNT(h.id_historial_flujo) FILTER (WHERE h.accion = 'ELIMINADO') AS "ELIMINADO",
          COUNT(h.id_historial_flujo) FILTER (WHERE h.accion IN ('FIRMO', 'APROBADO_CD')) AS "FIRMADO_HIST"
        FROM usuario u
        LEFT JOIN historial_flujo h ON (
          h._usuario_creacion = u.id_usuario
          AND h._fecha_creacion >= :fechaInicial::date
          AND h._fecha_creacion < (:fechaFinal::date + INTERVAL '1 day')
        )
        WHERE u.estado = 'ACTIVO' ${filtroUnidad}
        GROUP BY u.id_usuario, u.nombres, u.apellidos
        ORDER BY u.nombres ASC, u.apellidos ASC;
      `;

      const qryFirmasPorUsuario = `
        SELECT
          u.id_usuario,
          COUNT(DISTINCT d.id_documento) FILTER (
            WHERE d.estado IN ('CERRADO', 'APROBADO')
              AND COALESCE(d.firmado, false) = false
              AND COALESCE(d.aprobado_cd, false) = false
              AND (d.firmante_actual = u.id_usuario OR d.aprobador_cd_actual = u.id_usuario)
          ) AS "PENDIENTE_FIRMA",
          COUNT(DISTINCT d.id_documento) FILTER (
            WHERE d.estado IN ('CERRADO', 'APROBADO')
              AND (
                (d.firmaron IS NOT NULL AND u.id_usuario = ANY(d.firmaron))
                OR (d.aprobaron_cd IS NOT NULL AND u.id_usuario = ANY(d.aprobaron_cd))
              )
          ) AS "FIRMADO_DOCS"
        FROM usuario u
        LEFT JOIN documento d ON d.estado != 'ELIMINADO'
        WHERE u.estado = 'ACTIVO' ${filtroUnidad}
        GROUP BY u.id_usuario;
      `;

      const [histRows, firmaRows] = await Promise.all([
        sequelize.query(qryUsuarios, { replacements, type: sequelize.QueryTypes.SELECT }),
        sequelize.query(qryFirmasPorUsuario, { replacements, type: sequelize.QueryTypes.SELECT })
      ]);

      const firmaMap = new Map();
      firmaRows.forEach(r => firmaMap.set(Number(r.id_usuario), r));

      const resultado = histRows
        .map(row => {
          const f = firmaMap.get(Number(row._usuario_creacion)) || {};
          const pendFirma = parseInt(f.PENDIENTE_FIRMA || 0, 10);
          const firmado = Math.max(parseInt(row.FIRMADO_HIST || 0, 10), parseInt(f.FIRMADO_DOCS || 0, 10));
          return {
            _usuario_creacion: row._usuario_creacion,
            nombres: row.nombres,
            apellidos: row.apellidos,
            CREADO: parseInt(row.CREADO || 0, 10) || null,
            ENVIADO: parseInt(row.ENVIADO || 0, 10) || null,
            DERIVADO: parseInt(row.DERIVADO || 0, 10) || null,
            APROBADO: parseInt(row.APROBADO || 0, 10) || null,
            RECHAZADO: parseInt(row.RECHAZADO || 0, 10) || null,
            CERRADO: parseInt(row.CERRADO || 0, 10) || null,
            ELIMINADO: parseInt(row.ELIMINADO || 0, 10) || null,
            PENDIENTE_FIRMA: pendFirma || null,
            FIRMADO: firmado || null
          };
        })
        .filter(r =>
          r.CREADO || r.ENVIADO || r.DERIVADO || r.APROBADO || r.RECHAZADO || r.CERRADO || r.PENDIENTE_FIRMA || r.FIRMADO
        );

      return res.status(200).send(util.formatearMensaje('EXITO', 'Obtención de datos exitosa.', resultado));
    } catch (pError) {
      return res.status(412).send(util.formatearMensaje('ERROR', pError.message || pError));
    }
  });

  function toFloat(string) { return parseFloat(parseFloat(string).toFixed(2)); }
};
