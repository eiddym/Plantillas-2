const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgres://plantillas:postgres@localhost:5433/plantillas_db'
});

function generarSiglaSinConectores(texto) {
  if (!texto) return '';
  const conectores = new Set([
    'de', 'del', 'la', 'las', 'los', 'el', 'en', 'para', 'por', 'y', 'e', 'o', 'u', 'a', 'al', 'con', 'sin', 'sobre'
  ]);
  const palabras = texto
    .trim()
    .split(/\s+/)
    .filter(p => p.length > 0 && !conectores.has(p.toLowerCase()));

  return palabras.map(p => p.charAt(0).toUpperCase()).join('');
}

function estandarizarComponentes(items, templateNombre) {
  if (!Array.isArray(items)) return [];
  const usedKeys = new Set();
  const typeCounters = {};

  function procesarCampo(field, idx, prefix = '') {
    if (!field || typeof field !== 'object') return null;

    const cloned = JSON.parse(JSON.stringify(field));
    const rawType = cloned.type || 'texto';

    // 1. Mapeo a componentes nativos estandarizados
    let stdType = rawType;
    if (rawType === 'inputTextArea') stdType = 'textarea';
    else if (rawType === 'editor' || rawType === 'editor-texto') stdType = 'editorTexto';
    else if (rawType === 'inputCheckBox') stdType = 'checkbox';
    else if (rawType === 'inputSelect') stdType = 'select';
    else if (rawType === 'datepicker') stdType = 'calendario';
    else if (rawType === 'cargadorArchivos') stdType = 'archivo';
    else if (rawType === 'encabezado') stdType = 'datosGenerales';

    cloned.type = stdType;

    // 2. Normalización de templateOptions
    const to = cloned.templateOptions || cloned.props || {};
    cloned.templateOptions = to;
    delete cloned.props;

    // Configuración específica por tipo de componente
    if (stdType === 'texto' || stdType === 'parrafo') {
      if (!to.label && to.texto) to.label = to.texto;
      if (!to.label) to.label = '';

      const lbl = to.label.trim();
      const esMayuscula = lbl.length > 3 && lbl === lbl.toUpperCase() && !lbl.includes('.');

      if (!to.tipo) {
        if (stdType === 'parrafo' || lbl.length > 80 || (to.className && to.className.includes('justify'))) {
          to.tipo = 'p';
        } else if (esMayuscula || idx <= 2) {
          to.tipo = 'h1';
        } else {
          to.tipo = 'h2';
        }
      }

      if (!to.alineacion) {
        if (to.className && to.className.includes('justify')) to.alineacion = 'justify';
        else if (to.className && to.className.includes('left')) to.alineacion = 'left';
        else if (to.className && to.className.includes('right')) to.alineacion = 'right';
        else if (to.tipo === 'p') {
          to.alineacion = lbl.startsWith('De mi consideraci') ? 'left' : 'justify';
        } else {
          to.alineacion = 'center';
        }
      }
      to.className = `ap-text-${to.alineacion}`;
    } else if (stdType === 'editorTexto') {
      typeCounters['editorTexto'] = (typeCounters['editorTexto'] || 0) + 1;
      if (!to.label) {
        to.label = typeCounters['editorTexto'] === 1 ? 'Cuerpo Principal del Documento' : `Contenido de Sección ${typeCounters['editorTexto']}`;
      }
    } else if (stdType === 'datosGenerales') {
      if (!to.show) {
        to.show = { para: true, via: true, de: true, ref: true };
      }
    } else if (stdType === 'select') {
      if (!to.label) {
        to.label = 'Seleccione una opción:';
      }
    } else if (stdType === 'textarea') {
      if (!to.rows) to.rows = 3;
    }

    // 3. Claves (keys) nativas, semánticas y garantizadas únicas
    let rawKey = cloned.key;
    const esInvalida = rawKey === undefined || rawKey === null || rawKey === 0 || rawKey === '0' || rawKey === '' || rawKey === 'undefined';

    let keyFinal = '';

    if (stdType === 'datosGenerales' && !usedKeys.has('datosGenerales')) {
      keyFinal = 'datosGenerales';
    } else if (stdType === 'cite' && !usedKeys.has('cite')) {
      keyFinal = 'cite';
    } else if (stdType === 'ccArchivo' && !usedKeys.has('ccArchivo')) {
      keyFinal = 'ccArchivo';
    } else if (stdType === 'documentosRelacionados' && !usedKeys.has('documentosRelacionados')) {
      keyFinal = 'documentosRelacionados';
    } else if (stdType === 'editorTexto' && !usedKeys.has('cuerpo') && typeCounters['editorTexto'] === 1) {
      keyFinal = 'cuerpo';
    } else if (esInvalida) {
      typeCounters[stdType] = (typeCounters[stdType] || 0) + 1;
      keyFinal = prefix ? `${prefix}_${stdType}_${typeCounters[stdType]}` : `${stdType}_${typeCounters[stdType]}`;
    } else {
      const candidato = String(rawKey).trim();
      if (usedKeys.has(candidato)) {
        typeCounters[stdType] = (typeCounters[stdType] || 0) + 1;
        keyFinal = `${candidato}_${typeCounters[stdType]}`;
      } else {
        keyFinal = candidato;
      }
    }

    usedKeys.add(keyFinal);
    cloned.key = keyFinal;

    // 4. Soporte recursivo para contenedores de tipo layout
    if (Array.isArray(cloned.fieldGroup) && cloned.fieldGroup.length > 0) {
      cloned.fieldGroup = cloned.fieldGroup
        .map((child, cIdx) => procesarCampo(child, cIdx, keyFinal))
        .filter(Boolean);
    }

    return cloned;
  }

  return items.map((it, idx) => procesarCampo(it, idx)).filter(Boolean);
}

async function main() {
  await client.connect();
  console.log('Conectado a PostgreSQL. Iniciando estandarización de plantillas...');

  const query = 'SELECT id_plantilla_formly, nombre, abreviacion, plantilla FROM plantilla_formly ORDER BY id_plantilla_formly';
  const { rows } = await client.query(query);

  let actualizadas = 0;

  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.plantilla || '[]');
      const estandarizado = estandarizarComponentes(parsed, row.nombre);
      const nuevaPlantillaJson = JSON.stringify(estandarizado);

      let sigla = row.abreviacion;
      if (!sigla || sigla.trim() === '') {
        sigla = generarSiglaSinConectores(row.nombre);
      }

      await client.query(
        'UPDATE plantilla_formly SET plantilla = $1, abreviacion = $2 WHERE id_plantilla_formly = $3',
        [nuevaPlantillaJson, sigla, row.id_plantilla_formly]
      );

      actualizadas++;
    } catch (e) {
      console.error(`Error procesando plantilla #${row.id_plantilla_formly} (${row.nombre}):`, e.message);
    }
  }

  console.log(`Estandarización completada con éxito. Total plantillas procesadas y actualizadas: ${actualizadas}/${rows.length}`);
  await client.end();
}

main().catch(err => {
  console.error('Error fatal en migración:', err);
  process.exit(1);
});
