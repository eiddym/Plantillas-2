const tipos = {
  INTEGER: { fieldType: 'input', templateType: 'number' },
  BIGINT: { fieldType: 'input', templateType: 'number' },
  SMALLINT: { fieldType: 'input', templateType: 'number' },
  'CHARACTER VARYING': { fieldType: 'input', templateType: 'text' },
  VARCHAR: { fieldType: 'input', templateType: 'text' },
  CHAR: { fieldType: 'input', templateType: 'text' },
  STRING: { fieldType: 'input', templateType: 'text' },
  TEXT: { fieldType: 'textarea', templateType: '' },
  NUMERIC: { fieldType: 'input', templateType: 'number' },
  DECIMAL: { fieldType: 'input', templateType: 'number' },
  FLOAT: { fieldType: 'input', templateType: 'number' },
  REAL: { fieldType: 'input', templateType: 'number' },
  'DOUBLE PRECISION': { fieldType: 'input', templateType: 'number' },
  BOOLEAN: { fieldType: 'checkbox', templateType: '' },
  'TIME WITHOUT TIME ZONE': { fieldType: 'input', templateType: 'time' },
  'TIMESTAMP WITH TIME ZONE': { fieldType: 'datepicker', templateType: 'datetime-local' },
  'TIMESTAMP WITHOUT TIME ZONE': { fieldType: 'datepicker', templateType: 'datetime-local' },
  DATE: { fieldType: 'datepicker', templateType: 'date' },
  JSON: { fieldType: 'textarea', templateType: '' },
  JSONB: { fieldType: 'textarea', templateType: '' },
  BYTEA: { fieldType: 'textarea', templateType: '' },
  'USER-DEFINED': { fieldType: 'select', templateType: '' },
  ARRAY: { fieldType: 'select', templateType: '' },
  UUID: { fieldType: 'input', templateType: 'text' },
  TSVECTOR: { fieldType: 'input', templateType: 'text' },
};

function findField(xconfig, fieldDB) {
  if (!xconfig) return {};
  for (const i in xconfig) {
    if (xconfig[i].field === fieldDB || i === fieldDB) {
      return xconfig[i];
    }
  }
  return {};
}

function getXAttribute(xconfig, field, attribute) {
  let xfield = field;
  const found = findField(xconfig, field);
  if (found && attribute in found) {
    xfield = found[attribute];
  }
  return xfield;
}

function objxcat(obj, parametros) {
  let concatenar = '';
  if (!parametros) return '';
  parametros.split('+').forEach((item) => {
    concatenar += (obj[item.trim()] || '') + ' ';
  });
  return concatenar.trim();
}

async function getChoices(xconfig, field, appModelos) {
  const found = findField(xconfig, field);
  if (found && found.references && appModelos) {
    const rmodel = found.references.model;
    const rkey = found.references.key;
    let xchoice = found.xchoice || '';
    if (!xchoice && found.references.xchoice) {
      xchoice = found.references.xchoice;
    }

    const targetModel = appModelos[rmodel?.tableName || rmodel];
    if (targetModel && targetModel.rawAttributes) {
      const xconfigRel = targetModel.rawAttributes;
      const items = await targetModel.findAll();
      const rchoice = [];
      for (const item of items) {
        const xconfigRkey = findField(xconfigRel, rkey);
        const valKey = xconfigRkey.fieldName || rkey;
        rchoice.push({
          name: xchoice ? objxcat(item, xchoice) : String(item[valKey]),
          value: item[valKey],
        });
      }
      return { field, options: rchoice };
    }
  }
  return { field: 'empty', options: [] };
}

async function getDescribe(modelo, appModelos = {}) {
  const fields = await modelo.describe();
  const xconfig = modelo.rawAttributes;
  const xformly = [];
  const choicePromises = [];

  for (const field of Object.keys(fields)) {
    const dataField = fields[field];
    const baseType = dataField.type ? dataField.type.split('(')[0] : 'STRING';
    const tipoDef = tipos[baseType] || { fieldType: 'input', templateType: 'text' };

    const formlyField = {
      key: getXAttribute(xconfig, field, 'fieldName') || field,
      type: tipoDef.fieldType,
      templateOptions: {
        type: tipoDef.templateType,
        label: getXAttribute(xconfig, field, 'xlabel') || field,
        required: !dataField.allowNull,
      },
    };

    if (baseType === 'USER-DEFINED' && dataField.special) {
      const udOptions = dataField.special.map((opt) => ({ name: opt, value: opt }));
      formlyField.templateOptions.options = udOptions;
    }

    choicePromises.push(getChoices(xconfig, field, appModelos));
    xformly.push(formlyField);
  }

  const values = await Promise.all(choicePromises);
  const filters = values.filter((e) => e.field !== 'empty');

  for (const item of xformly) {
    const choiceMatch = filters.find((f) => f.field === item.key);
    if (choiceMatch) {
      item.type = 'select';
      item.templateOptions.options = choiceMatch.options;
    }
  }

  return xformly;
}

function formly(modelo, appModelos = {}) {
  return async (req, res) => {
    try {
      const response = await getDescribe(modelo, appModelos);
      return res.json(response);
    } catch (error) {
      return res.status(500).json({ error: error.message || error });
    }
  };
}

module.exports = {
  formly,
};
