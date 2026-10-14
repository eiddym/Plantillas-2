'use strict';

module.exports = {
  up: async function (queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // 1. Agregar columnas a la tabla unidad
      await queryInterface.sequelize.query(`
        ALTER TABLE unidad 
        ADD COLUMN IF NOT EXISTS fid_unidad_padre INTEGER REFERENCES unidad(id_unidad) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS ruta VARCHAR(255);
      `, { transaction });

      // 2. Crear función para actualizar ruta materializada
      await queryInterface.sequelize.query(`
        CREATE OR REPLACE FUNCTION actualizar_ruta_unidad()
        RETURNS TRIGGER AS $$
        DECLARE
            ruta_padre VARCHAR;
        BEGIN
            IF NEW.fid_unidad_padre IS NULL THEN
                NEW.ruta := NEW.id_unidad || '/';
            ELSE
                SELECT ruta INTO ruta_padre FROM unidad WHERE id_unidad = NEW.fid_unidad_padre;
                NEW.ruta := COALESCE(ruta_padre, '') || NEW.id_unidad || '/';
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `, { transaction });

      // 3. Crear trigger para mantener la ruta automáticamente
      await queryInterface.sequelize.query(`
        DROP TRIGGER IF EXISTS trg_actualizar_ruta_unidad ON unidad;
        CREATE TRIGGER trg_actualizar_ruta_unidad
        BEFORE INSERT OR UPDATE OF fid_unidad_padre ON unidad
        FOR EACH ROW
        EXECUTE FUNCTION actualizar_ruta_unidad();
      `, { transaction });

      // 4. Inicializar rutas de unidades existentes
      await queryInterface.sequelize.query(`
        UPDATE unidad
        SET ruta = id_unidad || '/'
        WHERE ruta IS NULL OR ruta = '';
      `, { transaction });

      // 5. Ajustar pesos de roles para reflejar la jerarquía organizacional
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
      `, { transaction });
    });
  },

  down: async function (queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        DROP TRIGGER IF EXISTS trg_actualizar_ruta_unidad ON unidad;
        DROP FUNCTION IF EXISTS actualizar_ruta_unidad();
        ALTER TABLE unidad DROP COLUMN IF EXISTS ruta;
        ALTER TABLE unidad DROP COLUMN IF EXISTS fid_unidad_padre;
      `, { transaction });
    });
  }
};
