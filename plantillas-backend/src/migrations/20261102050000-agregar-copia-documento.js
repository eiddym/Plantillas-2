'use strict';

module.exports = {
  up: async function (queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        ALTER TABLE documento 
        ADD COLUMN IF NOT EXISTS copia TEXT DEFAULT '[]';
      `, { transaction });
    });
  },

  down: async function (queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        ALTER TABLE documento DROP COLUMN IF EXISTS copia;
      `, { transaction });
    });
  }
};

