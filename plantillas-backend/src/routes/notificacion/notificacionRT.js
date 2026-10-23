module.exports = app => {
  const notificacion = app.src.db.models.notificacion;
  const util = app.src.lib.util;
  const Op = app.src.db.Sequelize.Op;

  /**
   * Obtiene la lista de notificaciones del usuario autenticado
   */
  app.get('/api/v1/notificacion/mis_notificaciones', (req, res) => {
    const idUsuario = req.body.audit_usuario ? req.body.audit_usuario.id_usuario : null;
    if (!idUsuario) {
      return res.status(401).send(util.formatearMensaje('ERROR', 'Usuario no autenticado'));
    }

    const limit = parseInt(req.query.limit || 20);
    const offset = parseInt(req.query.offset || 0);

    return notificacion.findAndCountAll({
      where: { destinatario: idUsuario },
      order: [['_fecha_creacion', 'DESC']],
      limit,
      offset
    })
    .then(resp => res.status(200).send(util.formatearMensaje('EXITO', 'Notificaciones obtenidas correctamente', resp)))
    .catch(error => res.status(412).send(util.formatearMensaje('ERROR', error.message || error)));
  });

  /**
   * Conteo de notificaciones no leídas
   */
  app.get('/api/v1/notificacion/resumen', (req, res) => {
    const idUsuario = req.body.audit_usuario ? req.body.audit_usuario.id_usuario : null;
    if (!idUsuario) {
      return res.status(401).send(util.formatearMensaje('ERROR', 'Usuario no autenticado'));
    }

    return notificacion.count({
      where: {
        destinatario: idUsuario,
        estado: 'ACTIVO'
      }
    })
    .then(totalPendientes => res.status(200).send(util.formatearMensaje('EXITO', 'Resumen obtenido', { totalPendientes })))
    .catch(error => res.status(412).send(util.formatearMensaje('ERROR', error.message || error)));
  });

  /**
   * Marcar una notificación como atendida/inactiva
   */
  app.put('/api/v1/notificacion/marcar_leida/:id', (req, res) => {
    const idUsuario = req.body.audit_usuario ? req.body.audit_usuario.id_usuario : null;
    const idNotificacion = req.params.id;

    return notificacion.update({ estado: 'INACTIVO' }, {
      where: {
        id_notificacion: idNotificacion,
        destinatario: idUsuario
      }
    })
    .then(() => res.status(200).send(util.formatearMensaje('EXITO', 'Notificación actualizada')))
    .catch(error => res.status(412).send(util.formatearMensaje('ERROR', error.message || error)));
  });
};
