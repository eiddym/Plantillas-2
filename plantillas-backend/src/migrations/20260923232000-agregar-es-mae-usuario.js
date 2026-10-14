'use strict';

module.exports = {
  up: async function (queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // 1. Agregar columna es_mae a la tabla usuario
      await queryInterface.sequelize.query(`
        ALTER TABLE usuario 
        ADD COLUMN IF NOT EXISTS es_mae BOOLEAN DEFAULT false;
      `, { transaction });

      // 2. Establecer id_usuario = 1 como MAE por defecto (si existe)
      await queryInterface.sequelize.query(`
        UPDATE usuario
        SET es_mae = true
        WHERE id_usuario = 1;
      `, { transaction });
    });
  },

  down: async function (queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        ALTER TABLE usuario DROP COLUMN IF EXISTS es_mae;
      `, { transaction });
    });
  }
};
