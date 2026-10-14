'use strict';

module.exports = {
  up: async function (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('menu', [
      // --------------------- CONFIGURACION -------------------------------
      {
        nombre: 'CONFIGURACIÓN',
        descripcion: 'Configuración',
        orden: 1,
        ruta: '',
        icono: 'build',
        estado: 'ACTIVO',
        _fecha_creacion: new Date(),
        _fecha_modificacion: new Date(),
        _usuario_creacion: 1,
        _usuario_modificacion: 1
      },
      {
        nombre: 'PLANTILLAS',
        descripcion: 'Bandeja de plantillas de documentos',
        orden: 1,
        ruta: 'plantillas',
        icono: 'settings',
        estado: 'ACTIVO',
        _fecha_creacion: new Date(),
        _fecha_modificacion: new Date(),
        _usuario_creacion: 1,
        _usuario_modificacion: 1,
        fid_menu_padre: 1
      },
      // --------------------- ADMINISTRACION DE USUARIOS -------------------------------
      {
        nombre: 'ADMINISTRACIÓN',
        descripcion: 'Administración',
        orden: 2,
        ruta: '',
        icono: 'settings',
        estado: 'ACTIVO',
        _fecha_creacion: new Date(),
        _fecha_modificacion: new Date(),
        _usuario_creacion: 1,
        _usuario_modificacion: 1
      },
      {
        nombre: 'USUARIOS',
        descripcion: 'Administración de usuarios',
        orden: 1,
        ruta: 'usuario',
        icono: 'group',
        estado: 'ACTIVO',
        _fecha_creacion: new Date(),
        _fecha_modificacion: new Date(),
        _usuario_creacion: 1,
        _usuario_modificacion: 1,
        fid_menu_padre: 3
      },
      {
        nombre: 'ROLES',
        descripcion: 'Administración de roles',
        orden: 2,
        ruta: 'rol',
        icono: 'credit_card',
        estado: 'ACTIVO',
        _fecha_creacion: new Date(),
        _fecha_modificacion: new Date(),
        _usuario_creacion: 1,
        _usuario_modificacion: 1,
        fid_menu_padre: 3
      },
      {
        nombre: 'MENÚS',
        descripcion: 'Administración de menús',
        orden: 3,
        ruta: 'menu',
        icono: 'menu',
        estado: 'ACTIVO',
        _fecha_creacion: new Date(),
        _fecha_modificacion: new Date(),
        _usuario_creacion: 1,
        _usuario_modificacion: 1,
        fid_menu_padre: 3
      },
      {
        nombre: 'UNIDADES',
        descripcion: 'Administración de unidades',
        orden: 4,
        ruta: 'unidad',
        icono: 'business',
        estado: 'ACTIVO',
        _fecha_creacion: new Date(),
        _fecha_modificacion: new Date(),
        _usuario_creacion: 1,
        _usuario_modificacion: 1,
        fid_menu_padre: 3
      },
      // --------------------- DOCUMENTOS -------------------------------
      {
        nombre: 'DOCUMENTOS',
        descripcion: 'Documentos',
        orden: 3,
        ruta: '',
        icono: 'folder',
        estado: 'ACTIVO',
        _fecha_creacion: new Date(),
        _fecha_modificacion: new Date(),
        _usuario_creacion: 1,
        _usuario_modificacion: 1
      },
      {
        nombre: 'MIS DOCUMENTOS',
        descripcion: 'Bandeja de documentos',
        orden: 2,
        ruta: 'documentos',
        icono: 'description',
        estado: 'ACTIVO',
        _fecha_creacion: new Date(),
        _fecha_modificacion: new Date(),
        _usuario_creacion: 1,
        _usuario_modificacion: 1,
        fid_menu_padre: 8
      },
      {
        nombre: 'DOCUMENTOS PENDIENTES',
        descripcion: 'Bandeja de documentos pendientes',
        orden: 3,
        ruta: 'aprobacion',
        icono: 'description',
        estado: 'ACTIVO',
        _fecha_creacion: new Date(),
        _fecha_modificacion: new Date(),
        _usuario_creacion: 1,
        _usuario_modificacion: 1,
        fid_menu_padre: 8
      },
      {
        nombre: 'IMPRIMIR DOCUMENTOS',
        descripcion: 'Bandeja de documentos para impresión',
        orden: 4,
        ruta: 'impresion',
        icono: 'description',
        estado: 'ACTIVO',
        _fecha_creacion: new Date(),
        _fecha_modificacion: new Date(),
        _usuario_creacion: 1,
        _usuario_modificacion: 1,
        fid_menu_padre: 8
      },
      {
        nombre: 'DERIVADOS',
        descripcion: 'Bandeja de documentos derivados',
        orden: 0,
        ruta: 'aprobacion',
        icono: 'description',
        estado: 'ACTIVO',
        _fecha_creacion: new Date(),
        _fecha_modificacion: new Date(),
        _usuario_creacion: 1,
        _usuario_modificacion: 1,
        fid_menu_padre: 8
      },
      {
        nombre: 'EN CURSO',
        descripcion: 'Bandeja de documentos en curso',
        orden: 0,
        ruta: 'en_curso',
        icono: 'description',
        estado: 'ACTIVO',
        _fecha_creacion: new Date(),
        _fecha_modificacion: new Date(),
        _usuario_creacion: 1,
        _usuario_modificacion: 1,
        fid_menu_padre: 8
      },
      {
        nombre: 'MONITOREO',
        descripcion: 'Bandeja de monitoreo de solicitud de documentos',
        orden: 0,
        ruta: 'monitoreo',
        icono: 'description',
        estado: 'ACTIVO',
        _fecha_creacion: new Date(),
        _fecha_modificacion: new Date(),
        _usuario_creacion: 1,
        _usuario_modificacion: 1,
        fid_menu_padre: 8
      },
      {
        nombre: 'FIRMAR',
        descripcion: 'Bandeja de documentos a firmar',
        orden: 1,
        ruta: 'firmar',
        icono: 'fingerprint',
        estado: 'ACTIVO',
        _fecha_creacion: new Date(),
        _fecha_modificacion: new Date(),
        _usuario_creacion: 1,
        _usuario_modificacion: 1,
        fid_menu_padre: 8
      },
      {
        nombre: 'APROBAR CON CD',
        descripcion: 'Bandeja de documentos a aprobar',
        orden: 1,
        ruta: 'aprobar_documento',
        icono: 'fingerprint',
        estado: 'ACTIVO',
        _fecha_creacion: new Date(),
        _fecha_modificacion: new Date(),
        _usuario_creacion: 1,
        _usuario_modificacion: 1,
        fid_menu_padre: 8
      },
      {
        nombre: 'CONTACTOS',
        descripcion: 'Bandeja de contactos',
        orden: 1,
        ruta: 'contactos',
        icono: 'user',
        estado: 'ACTIVO',
        _fecha_creacion: new Date(),
        _fecha_modificacion: new Date(),
        _usuario_creacion: 1,
        _usuario_modificacion: 1,
        fid_menu_padre: 1
      },
      {
        nombre: 'CATALOGOS',
        descripcion: 'Gestión de catálogos',
        orden: 1,
        ruta: '',
        icono: 'folder',
        estado: 'ACTIVO',
        _fecha_creacion: new Date(),
        _fecha_modificacion: new Date(),
        _usuario_creacion: 1,
        _usuario_modificacion: 1
      },
      {
        nombre: 'MIS CATALOGOS',
        descripcion: 'Bandeja de mis catálogos',
        orden: 1,
        ruta: 'catalogos',
        icono: 'folder',
        estado: 'ACTIVO',
        _fecha_creacion: new Date(),
        _fecha_modificacion: new Date(),
        _usuario_creacion: 1,
        _usuario_modificacion: 1,
        fid_menu_padre: 18
      },
      {
        nombre: 'COMPARTIDOS',
        descripcion: 'Bandeja de catálogos compartidos',
        orden: 1,
        ruta: 'compartidos',
        icono: 'user',
        estado: 'ACTIVO',
        _fecha_creacion: new Date(),
        _fecha_modificacion: new Date(),
        _usuario_creacion: 1,
        _usuario_modificacion: 1,
        fid_menu_padre: 18
      }
    ], {});

    // -----------------------------------------------------------------
    // FASE DE AUTOCORRECCIÓN POR NOMBRE (no depende de que los IDs
    // salgan secuenciales 1..20). Esto hace que el seeder sea inmune
    // a: registros previos en la tabla, secuencias de Postgres que no
    // arrancan en 1, reordenamientos futuros de este archivo, o
    // ejecuciones parciales anteriores. Si algún día alguien vuelve a
    // introducir un bug de padre incorrecto, este bloque lo revierte
    // en cada `db:seed:all`.
    // -----------------------------------------------------------------
    const relacionesPadreHijo = [
      { padre: 'CONFIGURACIÓN', hijos: ['PLANTILLAS', 'CONTACTOS'] },
      { padre: 'ADMINISTRACIÓN', hijos: ['USUARIOS', 'ROLES', 'MENÚS', 'UNIDADES'] },
      {
        padre: 'DOCUMENTOS',
        hijos: [
          'MIS DOCUMENTOS',
          'DOCUMENTOS PENDIENTES',
          'IMPRIMIR DOCUMENTOS',
          'DERIVADOS',
          'EN CURSO',
          'MONITOREO',
          'FIRMAR',
          'APROBAR CON CD'
        ]
      },
      { padre: 'CATALOGOS', hijos: ['MIS CATALOGOS', 'COMPARTIDOS'] }
    ];

    for (const relacion of relacionesPadreHijo) {
      await queryInterface.sequelize.query(
        `
        UPDATE menu AS hijo
        SET fid_menu_padre = padre.id_menu
        FROM menu AS padre
        WHERE padre.nombre = :padre
          AND hijo.nombre IN (:hijos)
          AND (hijo.fid_menu_padre IS DISTINCT FROM padre.id_menu)
        `,
        {
          replacements: {
            padre: relacion.padre,
            hijos: relacion.hijos
          }
        }
      );
    }

    // Los menús raíz (CONFIGURACIÓN, ADMINISTRACIÓN, DOCUMENTOS,
    // CATALOGOS) nunca deben tener padre.
    await queryInterface.sequelize.query(
      `
      UPDATE menu
      SET fid_menu_padre = NULL
      WHERE nombre IN ('CONFIGURACIÓN', 'ADMINISTRACIÓN', 'DOCUMENTOS', 'CATALOGOS')
        AND fid_menu_padre IS NOT NULL
      `
    );
  },

  down: function (queryInterface, Sequelize) {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.bulkDelete('Person', null, {});
    */
  }
};
