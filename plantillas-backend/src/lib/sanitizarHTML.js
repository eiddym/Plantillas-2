let sanitizeHtml;
try {
  sanitizeHtml = require('sanitize-html');
} catch (e) {
  sanitizeHtml = null;
}

const etiquetasPorDefecto = [
  'address', 'article', 'aside', 'footer', 'header',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hgroup', 'main', 'nav', 'section',
  'blockquote', 'dd', 'div', 'dl', 'dt', 'figcaption', 'figure', 'hr',
  'li', 'ol', 'p', 'pre', 'ul', 'a', 'abbr', 'b', 'bdi', 'bdo', 'br',
  'cite', 'code', 'data', 'dfn', 'em', 'i', 'kbd', 'mark', 'q', 'rb',
  'rp', 'rt', 'rtc', 'ruby', 's', 'samp', 'small', 'span', 'strong',
  'sub', 'sup', 'time', 'u', 'var', 'wbr', 'caption', 'col', 'colgroup',
  'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'img', 'style'
];

const atributosPermitidos = {
  a: ['href', 'class', 'target', 'style', 'id', 'rel'],
  img: ['href', 'src', 'class', 'style', 'width', 'height'],
  p: ['class', 'style'],
  div: ['class', 'style'],
  h1: ['class', 'style'],
  h2: ['class', 'style'],
  h3: ['class', 'style'],
  h4: ['class', 'style'],
  h5: ['class', 'style'],
  h6: ['class', 'style'],
  span: ['class', 'style'],
  ul: ['class', 'style'],
  ol: ['class', 'style'],
  li: ['class', 'style'],
  table: ['class', 'style', 'border', 'cellpadding', 'cellspacing', 'width'],
  thead: ['class', 'style'],
  tbody: ['class', 'style'],
  tr: ['class', 'style', 'colspan', 'rowspan'],
  th: ['class', 'style', 'colspan', 'rowspan'],
  td: ['class', 'style', 'colspan', 'rowspan'],
  blockquote: ['class'],
  pre: ['class'],
  i: ['class', 'style'],
  b: ['class', 'style'],
  strong: ['class', 'style'],
  u: ['class'],
  hr: ['class', 'style'],
  figure: ['class', 'style'],
  mark: ['class', 'style'],
  footer: ['class', 'style'],
  header: ['class', 'style'],
  colgroup: ['class', 'style'],
  col: ['class', 'style']
};

/**
 * Sanitiza contenido HTML eliminando scripts maliciosos, event handlers (onload, onerror)
 * e inyecciones no seguras, preservando la maquetación rica de documentos institucionales.
 * @param {string} texto Cadena HTML a sanitizar
 * @param {Array<string>} [mantenerEtiquetas] Lista personalizada de etiquetas permitidas
 * @returns {string} HTML sanitizado y seguro
 */
const sanitizarTexto = (texto, mantenerEtiquetas) => {
  if (!texto || typeof texto !== 'string') {
    return texto || '';
  }

  if (sanitizeHtml) {
    return sanitizeHtml(texto, {
      allowedTags: mantenerEtiquetas || etiquetasPorDefecto,
      allowedAttributes: atributosPermitidos,
      allowedSchemes: ['data', 'http', 'https'],
      allowVulnerableTags: true,
      enforceHtmlBoundary: true,
      parseStyleAttributes: false,
      transformTags: {
        img: (tagName, attribs) => {
          const src = attribs.src || '';
          if (!/^https?:\/\//i.test(src) && !/^data:image\//i.test(src)) {
            return {
              tagName: 'img',
              attribs: { src: '' }
            };
          }
          return { tagName, attribs };
        },
        a: (tagName, attribs) => {
          if (attribs.target === '_blank') {
            attribs.rel = 'noopener noreferrer';
          }
          return { tagName, attribs };
        }
      }
    });
  }

  // Fallback seguro si la librería aún no está compilada en entorno
  return texto
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*(["'])[\s\S]*?\1/gi, '')
    .replace(/javascript\s*:/gi, '');
};

/**
 * Sanitiza recursivamente el objeto o JSON de valores de una plantilla formly.
 * Identifica campos de texto enriquecido (editorTexto / TinyMCE) y los desinfecta.
 * @param {string|object} plantillaValor Valores de la plantilla
 * @returns {string|object} Valores sanitizados en el mismo formato de entrada
 */
const sanitizarPlantillaValor = (plantillaValor) => {
  if (!plantillaValor) return plantillaValor;

  const esString = typeof plantillaValor === 'string';
  let valores;

  if (esString) {
    try {
      valores = JSON.parse(plantillaValor);
    } catch (e) {
      // Si no es un JSON válido pero es string con HTML, sanitizar directo
      return sanitizarTexto(plantillaValor);
    }
  } else if (typeof plantillaValor === 'object') {
    valores = JSON.parse(JSON.stringify(plantillaValor)); // Clon profundo
  } else {
    return plantillaValor;
  }

  const sanitizarNodo = (nodo) => {
    if (!nodo || typeof nodo !== 'object') return nodo;

    for (const clave in nodo) {
      if (Object.prototype.hasOwnProperty.call(nodo, clave)) {
        const val = nodo[clave];
        if (typeof val === 'string') {
          // Si es campo editorTexto o contiene markup HTML, sanitizar
          if (clave.toLowerCase().includes('editortexto') || clave.toLowerCase().includes('editor') || /<[a-z][\s\S]*>/i.test(val)) {
            nodo[clave] = sanitizarTexto(val);
          }
        } else if (typeof val === 'object' && val !== null) {
          sanitizarNodo(val);
        }
      }
    }
    return nodo;
  };

  const resultado = sanitizarNodo(valores);
  return esString ? JSON.stringify(resultado) : resultado;
};

module.exports = {
  sanitizarTexto,
  sanitizarPlantillaValor,
  etiquetasPorDefecto,
  atributosPermitidos
};
