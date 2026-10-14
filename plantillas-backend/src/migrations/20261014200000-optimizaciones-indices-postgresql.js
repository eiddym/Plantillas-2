'use strict';

module.exports = {
  up: async function (queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // 1. Función inmutable para casteo seguro a JSONB y su índice GIN
      await queryInterface.sequelize.query(`
        CREATE OR REPLACE FUNCTION try_cast_jsonb(t text) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
        BEGIN
          RETURN t::jsonb;
        EXCEPTION WHEN OTHERS THEN
          RETURN NULL;
        END;
        $$;
      `, { transaction });

      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_documento_plantilla_valor_gin 
        ON documento USING GIN (try_cast_jsonb(plantilla_valor));
      `, { transaction });

      // 2. Índices compuestos para bandejas de entrada, estados y flujos
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_documento_usuario_estado_fecha 
        ON documento (_usuario_creacion, estado, _fecha_creacion DESC);
      `, { transaction });

      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_historial_flujo_doc_fecha 
        ON historial_flujo (id_documento, _fecha_creacion DESC);
      `, { transaction });

      // 3. Full-Text Search en español con tsvector y GIN
      await queryInterface.sequelize.query(`
        ALTER TABLE documento ADD COLUMN IF NOT EXISTS documento_tsv tsvector;
      `, { transaction });

      await queryInterface.sequelize.query(`
        UPDATE documento 
        SET documento_tsv = to_tsvector('spanish', 
          COALESCE(nombre, '') || ' ' || 
          COALESCE(referencia, '') || ' ' || 
          COALESCE(nombre_plantilla, '') || ' ' ||
          COALESCE(de, '') || ' ' ||
          COALESCE(para, '')
        );
      `, { transaction });

      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_documento_tsv 
        ON documento USING GIN(documento_tsv);
      `, { transaction });

      // 4. Trigger automático para mantener documento_tsv al día
      await queryInterface.sequelize.query(`
        CREATE OR REPLACE FUNCTION documento_tsv_trigger() RETURNS trigger AS $$
        BEGIN
          new.documento_tsv := to_tsvector('spanish', 
            COALESCE(new.nombre, '') || ' ' || 
            COALESCE(new.referencia, '') || ' ' || 
            COALESCE(new.nombre_plantilla, '') || ' ' ||
            COALESCE(new.de, '') || ' ' ||
            COALESCE(new.para, '')
          );
          RETURN new;
        END
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trg_documento_tsv_update ON documento;
        CREATE TRIGGER trg_documento_tsv_update
        BEFORE INSERT OR UPDATE OF nombre, referencia, nombre_plantilla, de, para
        ON documento
        FOR EACH ROW EXECUTE PROCEDURE documento_tsv_trigger();
      `, { transaction });
    });
  },

  down: async function (queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        DROP TRIGGER IF EXISTS trg_documento_tsv_update ON documento;
        DROP FUNCTION IF EXISTS documento_tsv_trigger();
        DROP INDEX IF EXISTS idx_documento_tsv;
        ALTER TABLE documento DROP COLUMN IF EXISTS documento_tsv;
        DROP INDEX IF EXISTS idx_historial_flujo_doc_fecha;
        DROP INDEX IF EXISTS idx_documento_usuario_estado_fecha;
        DROP INDEX IF EXISTS idx_documento_plantilla_valor_gin;
        DROP FUNCTION IF EXISTS try_cast_jsonb(text);
      `, { transaction });
    });
  }
};
