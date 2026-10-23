const util = require('../../lib/util.js');

module.exports = (app) => {
  const sequelize = app.src.db.sequelize;

  /**
   * @api {get} /api/v1/admin/firma/config Consulta el método de firma/aprobación activo
   * @apiGroup FirmaConfig
   */
  app.get('/api/v1/admin/firma/config', async (req, res) => {
    try {
      const [results] = await sequelize.query(`
        SELECT clave, valor, descripcion, _fecha_modificacion 
        FROM configuracion_sistema 
        WHERE clave = 'TIPO_FIRMA_VALIDACION'
        LIMIT 1;
      `);

      if (!results || results.length === 0) {
        // Inicializar si no existiera
        await sequelize.query(`
          INSERT INTO configuracion_sistema (clave, valor, descripcion)
          VALUES ('TIPO_FIRMA_VALIDACION', 'FIRMA_DIGITAL', 'Método rector de validación y firma de documentos (FIRMA_DIGITAL o CIUDADANIA_DIGITAL)')
          ON CONFLICT (clave) DO NOTHING;
        `);
        return res.status(200).send(util.formatearMensaje('EXITO', 'Configuración de firma recuperada', {
          tipo_firma: 'FIRMA_DIGITAL',
          descripcion: 'Firma Digital Oficial (FirmaTIC / Token / AGETIC)',
          _fecha_modificacion: new Date()
        }));
      }

      return res.status(200).send(util.formatearMensaje('EXITO', 'Configuración de firma recuperada', {
        tipo_firma: results[0].valor,
        descripcion: results[0].descripcion,
        _fecha_modificacion: results[0]._fecha_modificacion
      }));
    } catch (error) {
      return res.status(500).send(util.formatearMensaje('ERROR', 'Error al consultar configuración de firma: ' + error.message));
    }
  });

  /**
   * @api {put} /api/v1/admin/firma/config Actualiza el método de firma/aprobación activo
   * @apiGroup FirmaConfig
   */
  app.put('/api/v1/admin/firma/config', async (req, res) => {
    try {
      const { tipo_firma } = req.body;

      if (!tipo_firma || !['FIRMA_DIGITAL', 'CIUDADANIA_DIGITAL'].includes(tipo_firma)) {
        return res.status(400).send(util.formatearMensaje('ERROR', 'Modalidad de firma no válida. Debe ser FIRMA_DIGITAL o CIUDADANIA_DIGITAL'));
      }

      const desc = tipo_firma === 'FIRMA_DIGITAL'
        ? 'Firma Digital Oficial con Token / FirmaTIC (AGETIC)'
        : 'Aprobación de Documentos Oficiales con Ciudadanía Digital (AGETIC)';

      await sequelize.query(`
        INSERT INTO configuracion_sistema (clave, valor, descripcion, _fecha_modificacion)
        VALUES ('TIPO_FIRMA_VALIDACION', :valor, :desc, now())
        ON CONFLICT (clave) DO UPDATE 
        SET valor = EXCLUDED.valor, 
            descripcion = EXCLUDED.descripcion, 
            _fecha_modificacion = now();
      `, {
        replacements: { valor: tipo_firma, desc }
      });

      return res.status(200).send(util.formatearMensaje('EXITO', 'Configuración de método de firma actualizada exitosamente', {
        tipo_firma,
        descripcion: desc,
        _fecha_modificacion: new Date()
      }));
    } catch (error) {
      return res.status(500).send(util.formatearMensaje('ERROR', 'Error al actualizar configuración de firma: ' + error.message));
    }
  });
};
