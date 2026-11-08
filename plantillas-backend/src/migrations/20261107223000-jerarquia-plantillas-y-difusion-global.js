'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE plantilla_formly
        ADD COLUMN IF NOT EXISTS es_difusion_global BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS requiere_aprobacion_mae BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS unidades_permitidas TEXT DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS usuarios_permitidos TEXT DEFAULT '[]';
    `);

    await queryInterface.sequelize.query(`
      UPDATE plantilla_formly
      SET es_difusion_global = true, requiere_aprobacion_mae = true
      WHERE LOWER(nombre) LIKE '%circular%'
         OR LOWER(nombre) LIKE '%convocatoria%'
         OR LOWER(nombre) LIKE '%comunicado%';
    `);

    await queryInterface.sequelize.query(`
      UPDATE usuario
      SET es_mae = true
      WHERE LOWER(cargo) LIKE '%presidente%';
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE plantilla_formly
        DROP COLUMN IF EXISTS es_difusion_global,
        DROP COLUMN IF EXISTS requiere_aprobacion_mae,
        DROP COLUMN IF EXISTS unidades_permitidas,
        DROP COLUMN IF EXISTS usuarios_permitidos;
    `);
  }
};

