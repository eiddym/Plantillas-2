'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TYPE enum_conf_notificacion_canal ADD VALUE IF NOT EXISTS 'WHATSAPP';
      ALTER TYPE enum_conf_notificacion_canal ADD VALUE IF NOT EXISTS 'CORREO_WHATSAPP';
      ALTER TYPE enum_notificacion_canal ADD VALUE IF NOT EXISTS 'WHATSAPP';
      ALTER TYPE enum_notificacion_canal ADD VALUE IF NOT EXISTS 'CORREO_WHATSAPP';
      ALTER TABLE conf_notificacion ALTER COLUMN celular TYPE VARCHAR(20);
    `);
  },

  down: async () => {
    // En PostgreSQL los valores ENUM añadidos permanecen por compatibilidad hacia atrás
  }
};

