'use strict';

module.exports = {
  up: async function (queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE usuario
      SET fid_unidad = NULL
      WHERE usuario = 'sys_default'
        AND fid_unidad IS NOT NULL
    `);
  },

  down: async function () {
    // No se restaura la unidad ficticia de sys_default.
  }
};
