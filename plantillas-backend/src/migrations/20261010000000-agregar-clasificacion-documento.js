'use strict';

module.exports = {
  up: async function (queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // 1. Agregar columna clasificacion a la tabla documento
      await queryInterface.sequelize.query(`
        ALTER TABLE documento 
        ADD COLUMN IF NOT EXISTS clasificacion VARCHAR(50) DEFAULT 'Reservado';
      `, { transaction });

      // 2. Crear índice para acelerar consultas por clasificación
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_documento_clasificacion ON documento(clasificacion);
      `, { transaction });

      // 3. Poblar columna clasificacion desde plantilla_valor existente
      await queryInterface.sequelize.query(`
        UPDATE documento
        SET clasificacion = COALESCE(
          NULLIF(
            CASE 
              WHEN plantilla_valor LIKE '%"inputSelect"%' THEN 
                (plantilla_valor::json->>'inputSelect')
              ELSE 'Reservado'
            END, ''
          ), 'Reservado'
        );
      `, { transaction });
    });
  },

  down: async function (queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        DROP INDEX IF EXISTS idx_documento_clasificacion;
        ALTER TABLE documento DROP COLUMN IF EXISTS clasificacion;
      `, { transaction });
    });
  }
};
