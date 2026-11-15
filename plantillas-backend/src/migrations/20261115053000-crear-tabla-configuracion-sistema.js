'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS configuracion_sistema (
        clave VARCHAR(100) PRIMARY KEY,
        valor TEXT NOT NULL,
        descripcion TEXT,
        _fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT now(),
        _fecha_modificacion TIMESTAMP WITH TIME ZONE DEFAULT now()
      );

      INSERT INTO configuracion_sistema (clave, valor, descripcion)
      VALUES ('TIPO_FIRMA_VALIDACION', 'FIRMA_DIGITAL', 'Método rector de validación y firma de documentos (FIRMA_DIGITAL o CIUDADANIA_DIGITAL)')
      ON CONFLICT (clave) DO NOTHING;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('configuracion_sistema');
  }
};
