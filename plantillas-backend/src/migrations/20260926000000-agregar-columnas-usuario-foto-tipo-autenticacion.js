'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Crear el tipo ENUM enum_usuario_tipo_autenticacion si no existe
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_usuario_tipo_autenticacion') THEN
          CREATE TYPE "enum_usuario_tipo_autenticacion" AS ENUM('AUTHENTIK', 'LOCAL', 'CIUDADANIA');
        END IF;
      END
      $$;
    `);

    const tableDescription = await queryInterface.describeTable('usuario');

    if (!tableDescription.tipo_autenticacion) {
      await queryInterface.addColumn('usuario', 'tipo_autenticacion', {
        type: Sequelize.ENUM('AUTHENTIK', 'LOCAL', 'CIUDADANIA'),
        defaultValue: 'AUTHENTIK',
        allowNull: true,
      });
    }

    if (!tableDescription.foto) {
      await queryInterface.addColumn('usuario', 'foto', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('usuario');

    if (tableDescription.foto) {
      await queryInterface.removeColumn('usuario', 'foto');
    }

    if (tableDescription.tipo_autenticacion) {
      await queryInterface.removeColumn('usuario', 'tipo_autenticacion');
    }

    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_usuario_tipo_autenticacion";
    `);
  }
};
