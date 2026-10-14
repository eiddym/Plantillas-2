'use strict';

module.exports = {
  up: async function (queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // 1. Asegurar que el menú ARCHIVO exista y se mantenga como menú padre (fid_menu_padre = NULL)
      await queryInterface.sequelize.query(`
        UPDATE menu
        SET fid_menu_padre = NULL, estado = 'ACTIVO', ruta = 'archivo', icono = 'archive'
        WHERE nombre = 'ARCHIVO';
      `, { transaction });

      // 2. Asignar ARCHIVO a roles en rol_menu para que sea visible por los usuarios autorizados
      await queryInterface.sequelize.query(`
        INSERT INTO rol_menu (fid_rol, fid_menu, estado, _usuario_creacion, _usuario_modificacion, _fecha_creacion, _fecha_modificacion)
        SELECT r.id_rol, m.id_menu, 'ACTIVO', 1, 1, NOW(), NOW()
        FROM rol r, menu m
        WHERE m.nombre = 'ARCHIVO'
        AND r.nombre IN ('ADMIN', 'JEFE', 'OPERADOR', 'SECRETARIA', 'CORRESPONDENCIA')
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
      `, { transaction });
    });
  }
};
