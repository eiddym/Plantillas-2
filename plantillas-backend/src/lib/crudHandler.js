const _ = require('lodash');
const { Op } = require('sequelize');

function parseString(value) {
  if (!value) return undefined;
  return value.split(',');
}

function parseInteger(value) {
  const num = parseInt(value, 10);
  return Number.isNaN(num) ? undefined : num;
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch (e) {
    return parseString(value);
  }
}

function parseSort(value) {
  if (!value) return undefined;
  const keys = parseString(value);
  return keys.map((key) => {
    if (key.startsWith('-')) {
      return [key.substring(1), 'DESC'];
    }
    return [key, 'ASC'];
  });
}

function procesarFecha(pCadena) {
  if (!pCadena || typeof pCadena !== 'string') return false;
  let fecha = new Date(pCadena);
  const operador = pCadena.indexOf('-') > -1 ? '-' : pCadena.indexOf('/') > -1 ? '/' : null;
  if (!operador) return false;

  if (fecha.toString() === 'Invalid Date') {
    fecha = new Date((pCadena.split(operador).reverse()).join('-'));
  }
  const anio = fecha.getFullYear();
  if (!anio || Number.isNaN(anio)) return false;

  const vector = pCadena.split(operador);
  if (vector.length === 3) {
    const indice = vector.indexOf(anio.toString());
    if (indice > -1) {
      let inicio = null;
      let fin = null;
      if (indice === 0) {
        inicio = `${vector[0]}-${vector[1]}-${vector[2]}`;
        fin = `${vector[0]}-${vector[1]}-${parseInt(vector[2], 10) + 1}`;
      } else if (indice === 2) {
        inicio = `${vector[2]}-${vector[1]}-${vector[0]}`;
        fin = `${vector[2]}-${vector[1]}-${parseInt(vector[0], 10) + 1}`;
      }
      if (inicio && fin) {
        return {
          [Op.gte]: inicio,
          [Op.lt]: fin,
        };
      }
    }
  }
  return false;
}

function parse(params, { rawAttributes }) {
  const options = {
    where: {},
  };
  const keywords = ['fields', 'limit', 'offset', 'sort', 'filter', 'page', 'searchPro', 'tipoBus', 'campoSel'];

  const attr = parseString(params.fields);
  if (attr) options.attributes = attr;
  const lim = parseInteger(params.limit);
  if (lim !== undefined) options.limit = lim;
  const off = parseInteger(params.offset);
  if (off !== undefined) options.offset = off;
  const ord = parseSort(params.sort);
  if (ord) options.order = ord;

  _(params)
    .omit(keywords)
    .forOwn((value, key) => {
      if (rawAttributes && rawAttributes.hasOwnProperty(key)) {
        options.where[key] = parseJson(value);
      }
    });

  return options;
}

function raw(req, res, next) {
  if (typeof res.transform !== 'function') {
    res.transform = function transform(data) {
      return {
        tipoMensaje: 'EXITO',
        mensaje: 'Procesamiento exitoso',
        datos: data || {},
      };
    };
  }
  next();
}

class ModelHandler {
  constructor(model, defaults = { limit: 50, offset: 0 }) {
    this.model = model;
    this.defaults = defaults;
    this.custom = null;
    this.name = model && typeof model.getTableName === 'function' ? model.getTableName() : '';
  }

  create() {
    const handle = async (req, res, next) => {
      try {
        const row = await this.model.create(req.body);
        res.status(201);
        return res.send(res.transform(row));
      } catch (err) {
        return next(err);
      }
    };
    return [raw, handle];
  }

  get() {
    const handle = async (req, res, next) => {
      try {
        const row = await this.findOne(req.params, req.options);
        if (!row) {
          return res.status(404).json({
            tipoMensaje: 'ERROR',
            mensaje: 'Recurso no encontrado',
          });
        }
        return res.send(res.transform(row));
      } catch (err) {
        return next(err);
      }
    };
    return [raw, handle];
  }

  query() {
    const customQuery = async (req) => {
      if (!req.query.filter || req.query.filter === '') return null;
      const condiciones = [];
      const options = {
        attributes: _.keys(this.model.rawAttributes),
      };

      const fields = await this.model.describe();
      for (const key of Object.keys(fields)) {
        const field = fields[key];
        const obj = {};
        let tipo = field.type;
        let buscar = options.attributes.indexOf(key) !== -1;

        if (req.query.searchPro == 1 && buscar && req.query.tipoBus === 'campo') {
          buscar = req.query.campoSel === key;
        }

        if (req.query.searchPro == 1 && req.query.tipoBus === 'documento') {
          buscar = false;
          if (key === 'plantilla_valor') {
            obj[key] = { [Op.iLike]: `%${req.query.filter}%` };
          }
        }

        if (req.query.searchPro == 1 && req.query.tipoBus === 'flujo') {
          buscar = false;
          if (key === 'grupo') {
            obj[key] = req.query.filter;
          }
        }

        if (!buscar) {
          if (Object.keys(obj).length > 0) condiciones.push(obj);
          continue;
        }

        if (tipo.indexOf('CHARACTER VARYING') > -1) tipo = 'CHARACTER VARYING';

        switch (tipo) {
          case 'INTEGER': {
            const aux = parseInt(req.query.filter, 10);
            if (!Number.isNaN(aux) && req.query.filter.indexOf('/') === -1) {
              obj[key] = aux;
            }
            break;
          }
          case 'USER-DEFINED': {
            const aux = req.query.filter;
            if (field.special) {
              for (const j in field.special) {
                if (field.special[j].toLowerCase().indexOf(aux.toLowerCase()) === 0) {
                  obj[key] = field.special[j];
                }
              }
            }
            break;
          }
          case 'TIMESTAMP WITH TIME ZONE': {
            const fechaParsed = procesarFecha(req.query.filter);
            if (fechaParsed !== false) {
              obj[key] = fechaParsed;
            }
            break;
          }
          case 'CHARACTER VARYING':
          case 'TEXT': {
            obj[key] = { [Op.iLike]: `%${req.query.filter}%` };
            break;
          }
          default:
            obj[key] = req.query.filter;
            break;
        }

        if (obj.hasOwnProperty(key)) {
          condiciones.push(obj);
        }
      }

      return condiciones.length > 0 ? condiciones : null;
    };

    const handle = async (req, res, next) => {
      try {
        const condicionesCustom = await customQuery(req);
        let flag = false;
        if (condicionesCustom !== null) {
          flag = true;
          req.query.filter = condicionesCustom;
        }

        const { rows, start, end, count } = await this.findAndCountAll(req.query, req.options, flag);
        res.set('Content-Range', `${start}-${end}/${count}`);

        if (count > end) {
          res.status(206);
        } else {
          res.status(200);
        }

        const response = {
          total: count,
          resultado: rows,
        };
        return res.send(res.transform(response));
      } catch (err) {
        return next(err);
      }
    };

    return [raw, handle];
  }

  remove() {
    const handle = async (req, res, next) => {
      try {
        const row = await this.findOne(req.params);
        if (!row) {
          return res.status(404).json({
            tipoMensaje: 'ERROR',
            mensaje: 'Recurso no encontrado',
          });
        }
        await row.destroy();
        return res.sendStatus(204);
      } catch (err) {
        return next(err);
      }
    };
    return [handle];
  }

  update() {
    const handle = async (req, res, next) => {
      try {
        const row = await this.findOne(req.params);
        if (!row) {
          return res.status(404).json({
            tipoMensaje: 'ERROR',
            mensaje: 'Recurso no encontrado',
          });
        }
        await row.update(req.body);
        return res.send(res.transform(row));
      } catch (err) {
        return next(err);
      }
    };
    return [raw, handle];
  }

  async findOne(params, options = {}) {
    const localParams = { ...params };
    if (localParams.hasOwnProperty('id')) {
      localParams[`id_${this.name}`] = localParams.id;
      delete localParams.id;
    }
    const cleanOptions = { ...options };
    if (cleanOptions.hasOwnProperty('id')) delete cleanOptions.id;
    if (cleanOptions.hasOwnProperty('audit_usuario')) delete cleanOptions.audit_usuario;

    const parsed = parse(localParams, this.model);
    const finalOptions = _.merge(parsed, cleanOptions);
    return this.model.findOne(finalOptions);
  }

  async findAndCountAll(params, options = {}, custom = false) {
    const parsed = parse(params, this.model);
    const finalOptions = _(parsed)
      .defaults(this.defaults)
      .merge(options)
      .value();

    if (custom && params.filter) {
      finalOptions.where = finalOptions.where || {};
      finalOptions.where[Op.or] = params.filter;
    }

    if (params.page) {
      const pageNum = parseInt(params.page, 10);
      finalOptions.offset = (pageNum <= 1 ? 0 : pageNum - 1) * finalOptions.limit;
    }

    const { count, rows } = await this.model.findAndCountAll(finalOptions);
    const start = finalOptions.offset || 0;
    const end = Math.min(count, start + (finalOptions.limit || count));

    return {
      rows,
      start,
      end,
      count,
    };
  }
}

const create = (model) => new ModelHandler(model).create();
const get = (model) => new ModelHandler(model).get();
const query = (model) => new ModelHandler(model).query();
const update = (model) => new ModelHandler(model).update();
const remove = (model) => new ModelHandler(model).remove();

module.exports = {
  ModelHandler,
  create,
  get,
  query,
  update,
  remove,
};
