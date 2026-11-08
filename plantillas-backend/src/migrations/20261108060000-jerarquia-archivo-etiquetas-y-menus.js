'use strict';

module.exports = {
  up: async (queryInterface) => {
    // 1. Agregar columna etiquetas (JSONB) y alcance_archivo en documento si no existen
    await queryInterface.sequelize.query(`
      ALTER TABLE documento
        ADD COLUMN IF NOT EXISTS etiquetas JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS alcance_archivo VARCHAR(50) DEFAULT 'UNIDAD';
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_documento_etiquetas_gin ON documento USING gin (etiquetas);
      CREATE INDEX IF NOT EXISTS idx_documento_origen_radicacion ON documento (origen_radicacion);
    `);

    // 2. Ajustar rol_menu según jerarquía institucional:
    // - Menú 35 (ARCHIVO padre) y 39 (ARCHIVO INSTITUCIONAL): ACTIVO para TODOS los roles (todo el personal)
    // - Menú 37 (ARCHIVO GENERAL): ACTIVO por defecto solo para ADMIN (1) y SECRETARIA (4) (y MAE por código)
    // - Menú 38 (ARCHIVO DE UNIDAD): ACTIVO por defecto solo para ADMIN (1) y JEFE (2) (y MAE/Subjefe por código)
    await queryInterface.sequelize.query(`
      INSERT INTO rol_menu (fid_rol, fid_menu, estado, _usuario_creacion, _fecha_creacion, _fecha_modificacion)
      SELECT r.id_rol, m.id_menu, 'ACTIVO', 1, NOW(), NOW()
      FROM rol r
      CROSS JOIN menu m
      WHERE m.id_menu IN (35, 39)
        AND NOT EXISTS (
          SELECT 1 FROM rol_menu rm WHERE rm.fid_rol = r.id_rol AND rm.fid_menu = m.id_menu
        );

      UPDATE rol_menu SET estado = 'ACTIVO', _fecha_modificacion = NOW()
      WHERE fid_menu IN (35, 39);

      UPDATE rol_menu SET estado = 'ACTIVO', _fecha_modificacion = NOW()
      WHERE fid_menu = 37 AND fid_rol IN (1, 4);

      UPDATE rol_menu SET estado = 'INACTIVO', _fecha_modificacion = NOW()
      WHERE fid_menu = 37 AND fid_rol NOT IN (1, 4);

      UPDATE rol_menu SET estado = 'ACTIVO', _fecha_modificacion = NOW()
      WHERE fid_menu = 38 AND fid_rol IN (1, 2);

      UPDATE rol_menu SET estado = 'INACTIVO', _fecha_modificacion = NOW()
      WHERE fid_menu = 38 AND fid_rol NOT IN (1, 2);
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE documento DROP COLUMN IF EXISTS etiquetas;
    `);
  }
};

