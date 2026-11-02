import { FormlyFieldConfig } from '@ngx-formly/core';

/**
 * Normaliza y sanea esquemas de campos Formly provenientes de la base de datos o diseñador.
 * Resuelve problemas heredados de Formly 1.x / AngularJS:
 * 1. Campos con key: 0, key: null, key: undefined o key: "" -> Se les asigna una clave única en string (ej. "inputt_5").
 * 2. Claves duplicadas en una misma plantilla (ej. múltiples "inputTextArea", "parrafo", "texto") -> Se disambiguan como "inputTextArea_5", "inputTextArea_7".
 * 3. Mapeo retrocompatible con `plantilla_valor` histórico que usaba `${type}-${index}` (ej. "editorTexto-3", "inputTextArea-5").
 * 4. Soporte recursivo para contenedores de tipo `layout` y sus `fieldGroup`.
 */
export function normalizarEsquemaFormly(
  rawFields: any[],
  model: Record<string, any> = {},
  prefix = ''
): FormlyFieldConfig[] {
  if (!Array.isArray(rawFields)) {
    return [];
  }

  const clavesUsadas = new Set<string>();

  return rawFields.map((field, index) => {
    if (!field || typeof field !== 'object') {
      return { type: 'texto', templateOptions: { label: '' } };
    }

    const fieldCopy: FormlyFieldConfig = { ...field };
    const rawType = fieldCopy.type || 'texto';
    fieldCopy.type = rawType;

    // Asegurar templateOptions y props
    fieldCopy.templateOptions = { ...(fieldCopy.templateOptions || {}) };
    fieldCopy.props = fieldCopy.templateOptions;

    // Determinar la clave (key) normalizada
    let keyOriginal = fieldCopy.key;
    let keyNormalizada = '';

    const esInvalida = 
      keyOriginal === undefined || 
      keyOriginal === null || 
      keyOriginal === 0 || 
      keyOriginal === '0' || 
      keyOriginal === '';

    if (esInvalida) {
      keyNormalizada = prefix ? `${prefix}_${rawType}_${index}` : `${rawType}_${index}`;
    } else {
      keyNormalizada = String(keyOriginal).trim();
      // Si la clave ya fue usada en este mismo nivel, sufijar con el índice para evitar colisión
      if (clavesUsadas.has(keyNormalizada)) {
        keyNormalizada = prefix ? `${prefix}_${keyNormalizada}_${index}` : `${keyNormalizada}_${index}`;
      }
    }

    clavesUsadas.add(keyNormalizada);
    fieldCopy.key = keyNormalizada;

    // Hidratación retrocompatible del modelo:
    // 1. Clave exacta
    // 2. Clave histórica tipo-índice: `${rawType}-${index}`
    // 3. Clave original si era diferente
    const claveHistorica = `${rawType}-${index}`;
    if (model[keyNormalizada] === undefined) {
      if (model[claveHistorica] !== undefined) {
        model[keyNormalizada] = model[claveHistorica];
      } else if (keyOriginal && model[String(keyOriginal)] !== undefined) {
        model[keyNormalizada] = model[String(keyOriginal)];
      }
    }

    // Si es editorTexto y aún no tiene valor en el modelo, buscar si existe 'cuerpo', 'editorTexto-0', 'textarea-0' o 'inputTextArea'
    if (rawType === 'editorTexto' && !model[keyNormalizada]) {
      if (model['cuerpo']) {
        model[keyNormalizada] = model['cuerpo'];
      } else if (model['editorTexto-0']) {
        model[keyNormalizada] = model['editorTexto-0'];
      } else if (model['textarea-0']) {
        model[keyNormalizada] = model['textarea-0'];
      } else if (model['inputTextArea']) {
        model[keyNormalizada] = model['inputTextArea'];
      } else {
        model[keyNormalizada] = '';
      }
    }

    // Normalización recursiva de fieldGroup (para layout u otros grupos)
    if (Array.isArray(fieldCopy.fieldGroup) && fieldCopy.fieldGroup.length > 0) {
      fieldCopy.fieldGroup = normalizarEsquemaFormly(
        fieldCopy.fieldGroup,
        model,
        `${keyNormalizada}_grp`
      );
    }

    return fieldCopy;
  });
}
