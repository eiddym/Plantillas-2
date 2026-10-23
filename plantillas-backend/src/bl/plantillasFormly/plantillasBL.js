const _ = require('lodash');
const hash = require('object-hash');
const crypto = require('crypto');

module.exports = {

  /**
   * Genera un hash determinista SHA-256 de la definición de una plantilla formly.
   * Garantiza la inmutabilidad de versiones y el sellado criptográfico del formato.
   * @param {string|object} plantilla Estructura o JSON de la plantilla
   * @returns {string} Hash SHA-256 hexadecimal
   */
  generarHashPlantilla: (plantilla) => {
    try {
      const obj = typeof plantilla === 'string' ? JSON.parse(plantilla) : plantilla;
      return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');
    } catch (e) {
      const str = typeof plantilla === 'string' ? plantilla : JSON.stringify(plantilla);
      return crypto.createHash('sha256').update(str).digest('hex');
    }
  },

  /**
   * Valida si una plantilla corresponde con alguna de las versiones activas registradas.
   * Soporta tanto el hash SHA-256 estricto como object-hash histórico.
   * @param {Array} plantillas Lista de plantillas recuperadas de la base de datos
   * @param {string} plantillaValidar Estructura a verificar
   * @returns {boolean} True si coincide con una plantilla activa
   */
  validarPlantilla: (plantillas, plantillaValidar) => {
    let hashAValidar;
    let sha256AValidar;

    try {
      const parsed = typeof plantillaValidar === 'string' ? JSON.parse(plantillaValidar) : plantillaValidar;
      hashAValidar = hash(parsed);
      sha256AValidar = crypto.createHash('sha256').update(JSON.stringify(parsed)).digest('hex');
    } catch (e) {
      hashAValidar = hash(plantillaValidar);
      sha256AValidar = crypto.createHash('sha256').update(String(plantillaValidar)).digest('hex');
    }

    const estadosValidos = ['ACTIVO'];
    let cont = 0;

    _.map(plantillas, item => {
      const objTemp = item.dataValues || item;
      if (estadosValidos.indexOf(objTemp.estado) > -1) {
        try {
          const parsedDb = typeof objTemp.plantilla === 'string' ? JSON.parse(objTemp.plantilla) : objTemp.plantilla;
          const hashTemp = hash(parsedDb);
          const sha256Temp = crypto.createHash('sha256').update(JSON.stringify(parsedDb)).digest('hex');

          if (hashAValidar === hashTemp || sha256AValidar === sha256Temp) {
            cont++;
          }
        } catch (e) {
          if (hashAValidar === hash(objTemp.plantilla)) {
            cont++;
          }
        }
      }
    });

    return cont > 0;
  },

  /**
   * Función que actualiza el identificador del grupo de un documento.
   * @param  {Modelo} modeloDocumento Modelo de datos del documento
   * @param  {Objeto} doc             Instancia del documento
   * @param  {Objeto} tr              Instancia de la transaccion en curso
   * @return {Promesa}                Retorna una promesa.
   */
  actualizarGrupo: (modeloDocumento, doc, tr) =>
    new Promise((resolve, reject) => {
      if (doc.documento_padre) {
        modeloDocumento.findByPk(doc.documento_padre)
          .then(doc_padre => {
            if (doc_padre) {
              return doc.update({ grupo: doc_padre.grupo }, tr);
            }
            return doc.update({ grupo: doc.id_documento }, tr);
          })
          .then(resu => resolve(resu))
          .catch(e => reject(e));
      } else {
        doc.update({ grupo: doc.id_documento }, tr)
          .then(resu => resolve(resu))
          .catch(e => reject(e));
      }
    }),
};
