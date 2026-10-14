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
        'DOCUMENTOS PENDIENTES',
        'ARCHIVO'
      ],

      JEFE: [
        'MIS DOCUMENTOS',
        'MONITOREO',
        'DOCUMENTOS PENDIENTES',
        'DERIVADOS',
        'FIRMAR',
        'MIS CATALOGOS',
        'COMPARTIDOS',
        'ARCHIVO'
      ],

      OPERADOR: [
        'MIS DOCUMENTOS',
        'DOCUMENTOS PENDIENTES',
        'FIRMAR',
        'MIS CATALOGOS',
        'COMPARTIDOS',
        'ARCHIVO'
      ],

      SECRETARIA: [
        'MIS DOCUMENTOS',
        'MONITOREO',
        'DOCUMENTOS PENDIENTES',
        'FIRMAR',
        'IMPRIMIR DOCUMENTOS',
        'MIS CATALOGOS',
        'COMPARTIDOS',
        'ARCHIVO'
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
        'CONTACTOS',
        'ARCHIVO'
      ],

      CONTACTOS: [
        'CONTACTOS'
      ]
    };

    await queryInterface.sequelize.transaction(async (transaction) => {
      const nombresRoles = Object.keys(permisos);

      // Permite repetir el seeder en desarrollo sin duplicar relaciones.
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
        const [roles] = await queryInterface.sequelize.query(`
          SELECT id_rol
          FROM rol
          WHERE nombre = :nombreRol
        `, {
          replacements: { nombreRol },
          transaction
        });

        if (!roles.length) {
          throw new Error(`No existe el rol ${nombreRol}`);
        }

        const [menus] = await queryInterface.sequelize.query(`
          SELECT id_menu, nombre
          FROM menu
          WHERE nombre IN (:nombresMenus)
        `, {
          replacements: {
            nombresMenus: permisos[nombreRol]
          },
          transaction
        });

        const menusEncontrados = new Set(
          menus.map((menu) => menu.nombre)
        );

        const menusFaltantes = permisos[nombreRol].filter(
          (nombreMenu) => !menusEncontrados.has(nombreMenu)
        );

        if (menusFaltantes.length) {
          throw new Error(
            `Faltan menús para ${nombreRol}: ${menusFaltantes.join(', ')}`
          );
        }

        const relaciones = menus.map((menu) => ({
          fid_rol: roles[0].id_rol,
          fid_menu: menu.id_menu,
          estado: 'ACTIVO',
          _fecha_creacion: new Date(),
          _fecha_modificacion: new Date(),
          _usuario_creacion: 1,
          _usuario_modificacion: 1
        }));

        await queryInterface.bulkInsert(
          'rol_menu',
          relaciones,
          { transaction }
        );
      }
    });
  },

  down: async function () {
    // No se restaura la matriz anterior porque contenía relaciones incorrectas.
  }
};
