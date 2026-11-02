'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.addColumn('unidad', 'es_colectiva', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    } catch (e) {
      console.log('Columna es_colectiva ya existe o error controlado:', e.message);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeColumn('unidad', 'es_colectiva');
    } catch (e) {
      console.log('Error revirtiendo columna es_colectiva:', e.message);
    }
  }
};

