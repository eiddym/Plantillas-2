'use strict';

module.exports = {
  up: async function (queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // 1. Obtener ID del menú padre DOCUMENTOS
      const [padre] = await queryInterface.sequelize.query(`
        SELECT id_menu FROM menu WHERE nombre = 'DOCUMENTOS' LIMIT 1;
      `, { transaction });

      const fidPadre = padre && padre.length ? padre[0].id_menu : null;

      // 2. Insertar menú ARCHIVO si no existe
      await queryInterface.sequelize.query(`
        INSERT INTO menu (nombre, descripcion, orden, ruta, icono, estado, fid_menu_padre, _usuario_creacion, _usuario_modificacion, _fecha_creacion, _fecha_modificacion)
        SELECT 'ARCHIVO', 'Bandeja de archivo de documentos expedientes', 6, 'archivo', 'archive', 'ACTIVO', ${fidPadre || 'NULL'}, 1, 1, NOW(), NOW()
        WHERE NOT EXISTS (SELECT 1 FROM menu WHERE nombre = 'ARCHIVO');
      `, { transaction });

      // 3. Asignar ARCHIVO a roles relevantes en rol_menu
      await queryInterface.sequelize.query(`
        INSERT INTO rol_menu (fid_rol, fid_menu, _usuario_creacion, _usuario_modificacion, _fecha_creacion, _fecha_modificacion)
        SELECT r.id_rol, m.id_menu, 1, 1, NOW(), NOW()
        FROM rol r, menu m
        WHERE m.nombre = 'ARCHIVO'
        AND r.nombre IN ('ADMIN', 'SUPERADMIN', 'JEFE', 'OPERADOR', 'SECRETARIA', 'CORRESPONDENCIA')
        AND NOT EXISTS (
          SELECT 1 FROM rol_menu rm WHERE rm.fid_rol = r.id_rol AND rm.fid_menu = m.id_menu
        );
      `, { transaction });
    });
  },

  down: async function (queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        DELETE FROM rol_menu WHERE fid_menu IN (SELECT id_menu FROM menu WHERE nombre = 'ARCHIVO');
        DELETE FROM menu WHERE nombre = 'ARCHIVO';
      `, { transaction });
    });
  }
};
