'use strict';

module.exports = {
  up: async function (queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // 1. Agregar columnas a la tabla documento
      await queryInterface.sequelize.query(`
        ALTER TABLE documento 
        ADD COLUMN IF NOT EXISTS lote_id INTEGER,
        ADD COLUMN IF NOT EXISTS raiz_cite INTEGER REFERENCES documento(id_documento) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS cites_referidos JSONB DEFAULT '[]'::jsonb;
      `, { transaction });

      // 2. Asignar lote_id inicial igual a id_documento para documentos raíz
      await queryInterface.sequelize.query(`
        UPDATE documento
        SET lote_id = id_documento,
            raiz_cite = id_documento
        WHERE lote_id IS NULL AND documento_padre IS NULL;
      `, { transaction });

      // 3. Propagar lote_id y raiz_cite a documentos derivados existentes
      await queryInterface.sequelize.query(`
        WITH RECURSIVE arbol_documentos AS (
          SELECT id_documento, documento_padre, id_documento AS raiz_id
          FROM documento
          WHERE documento_padre IS NULL
          UNION ALL
          SELECT d.id_documento, d.documento_padre, a.raiz_id
          FROM documento d
          JOIN arbol_documentos a ON d.documento_padre = a.id_documento
        )
        UPDATE documento d
        SET lote_id = a.raiz_id,
            raiz_cite = a.raiz_id
        FROM arbol_documentos a
        WHERE d.id_documento = a.id_documento
          AND (d.lote_id IS NULL OR d.raiz_cite IS NULL);
      `, { transaction });
    });
  },

  down: async function (queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        ALTER TABLE documento DROP COLUMN IF EXISTS cites_referidos;
        ALTER TABLE documento DROP COLUMN IF EXISTS raiz_cite;
        ALTER TABLE documento DROP COLUMN IF EXISTS lote_id;
      `, { transaction });
    });
  }
};
