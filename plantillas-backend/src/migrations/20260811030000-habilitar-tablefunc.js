'use strict';

module.exports = {
  up: async function (queryInterface) {
    await queryInterface.sequelize.query(
      'CREATE EXTENSION IF NOT EXISTS tablefunc;'
    );
  },

  down: async function () {
    // No eliminar tablefunc: otros módulos usan crosstab().
  }
};
