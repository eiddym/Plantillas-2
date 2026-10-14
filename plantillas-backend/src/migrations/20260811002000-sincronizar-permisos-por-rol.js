'use strict';

module.exports = {
  up: async function (queryInterface) {
    const permisos = {
      ADMIN: [
        'PLANTILLAS',
        'USUARIOS',
        'ROLES',
        'MENÚS',
        'UNIDADES',
        'MIS DOCUMENTOS',
        'DOCUMENTOS PENDIENTES'
      ],

      JEFE: [
        'MIS DOCUMENTOS',
        'MONITOREO',
        'DOCUMENTOS PENDIENTES',
        'DERIVADOS',
        'FIRMAR',
        'MIS CATALOGOS',
        'COMPARTIDOS'
      ],

      OPERADOR: [
        'MIS DOCUMENTOS',
        'DOCUMENTOS PENDIENTES',
        'FIRMAR',
        'MIS CATALOGOS',
        'COMPARTIDOS'
      ],

      SECRETARIA: [
        'MIS DOCUMENTOS',
        'MONITOREO',
        'DOCUMENTOS PENDIENTES',
        'FIRMAR',
        'IMPRIMIR DOCUMENTOS',
        'MIS CATALOGOS',
        'COMPARTIDOS'
      ],

      CONFIGURADOR: [
        'CONTACTOS'
      ],

      CORRESPONDENCIA: [
        'MIS DOCUMENTOS',
        'MONITOREO',
        'DOCUMENTOS PENDIENTES',
        'FIRMAR',
        'IMPRIMIR DOCUMENTOS',
        'MIS CATALOGOS',
        'COMPARTIDOS',
        'CONTACTOS'
      ],

      CONTACTOS: [
        'CONTACTOS'
      ]
    };

    await queryInterface.sequelize.transaction(async (transaction) => {
      const nombresRoles = Object.keys(permisos);

      await queryInterface.sequelize.query(`
        DELETE FROM rol_menu
        WHERE fid_rol IN (
          SELECT id_rol
          FROM rol
          WHERE nombre IN (:nombresRoles)
        )
      `, {
        replacements: { nombresRoles },
        transaction
      });

      for (const nombreRol of nombresRoles) {
        const nombresMenus = permisos[nombreRol];

        await queryInterface.sequelize.query(`
          INSERT INTO rol_menu (
            fid_rol,
            fid_menu,
            estado,
            _fecha_creacion,
            _fecha_modificacion,
            _usuario_creacion,
            _usuario_modificacion
          )
          SELECT
            rol.id_rol,
            menu.id_menu,
            'ACTIVO',
            NOW(),
            NOW(),
            1,
            1
          FROM rol
          CROSS JOIN menu
          WHERE rol.nombre = :nombreRol
            AND menu.nombre IN (:nombresMenus)
        `, {
          replacements: {
            nombreRol,
            nombresMenus
          },
          transaction
        });
      }
    });
  },

  down: async function () {
    // No se restaura la matriz anterior porque contenía relaciones incorrectas.
  }
};
