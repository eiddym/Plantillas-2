'use strict';

module.exports = {
  up: async function (queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE rol
      SET peso = CASE nombre
        WHEN 'JEFE' THEN 100
        WHEN 'CORRESPONDENCIA' THEN 90
        WHEN 'SECRETARIA' THEN 80
        WHEN 'OPERADOR' THEN 70
        WHEN 'CONFIGURADOR' THEN 60
        WHEN 'ADMIN' THEN 50
        WHEN 'CONTACTOS' THEN 10
        ELSE peso
      END
      WHERE estado = 'ACTIVO';
    `);
  },

  down: async function () {
    // No restaurar pesos desconocidos automáticamente.
  }
};
