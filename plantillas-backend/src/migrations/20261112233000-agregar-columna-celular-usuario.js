'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('usuario');
    if (!tableInfo.celular) {
      await queryInterface.addColumn('usuario', 'celular', {
        type: Sequelize.STRING(30),
        allowNull: true,
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('usuario');
    if (tableInfo.celular) {
      await queryInterface.removeColumn('usuario', 'celular');
    }
  }
};

