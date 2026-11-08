'use strict';

const fs = require('fs');
const path = require('path');
const loteBL = require('../../bl/plantillasFormly/loteBL');
const notificar = require('../../lib/notificacion');
const whatsapp = require('../../lib/whatsapp');

module.exports = app => {
  const Documento = app.src.db.models.documento;
  const HistorialFlujo = app.src.db.models.historial_flujo;
  const Usuario = app.src.db.models.usuario;
  const Unidad = app.src.db.models.unidad;
  const Rol = app.src.db.models.rol;
  const UsuarioRol = app.src.db.models.usuario_rol;
  const RolMenu = app.src.db.models.rol_menu;
  const Menu = app.src.db.models.menu;
  const Correlativo = app.src.db.models.correlativo;
  const util = app.src.lib.util;
  const Op = app.src.db.Sequelize.Op;

  const ETIQUETAS_SUGERIDAS = [
    'Normativa',
    'Urgente',
    'Auditoría',
    'Contratos',
    'Operaciones Mineras',
    'Finanzas / Contabilidad',
    'Recursos Humanos',
    'Consejo Administración',
    'Consejo Vigilancia',
    'Legal / Jurídico'
  ];

  /**
   * Extrae de forma inteligente la sigla/código de un documento institucional.
   */
  function derivarSigla(nombreDoc) {
    if (!nombreDoc) return 'DOC';
    const clean = nombreDoc.trim();
    const lower = clean.toLowerCase();

    if (lower.includes('personalidad jur') || lower.includes('personeria jur') || lower.includes('personería jur')) {
      return 'PJ';
    }
    if (lower.includes('reglamento interno') && lower.includes('personal')) {
      return 'RIP';
    }
    if (lower.includes('reglamento interno') && lower.includes('trabajo')) {
      return 'RIT';
    }
    if (lower.includes('estatuto')) {
      return 'EO';
    }
    if (lower.includes('codigo de etica') || lower.includes('código de ética')) {
      return 'CE';
    }
    if (lower.includes('manual') && (lower.includes('funciones') || lower.includes('organizacion') || lower.includes('organización'))) {
      return 'MOF';
    }
    if (lower.includes('plan operativo')) {
      return 'POA';
    }
    if (lower.includes('plan estrategico') || lower.includes('plan estratégico')) {
      return 'PEI';
    }
    if (lower.includes('resolucion de directorio') || lower.includes('resolución de directorio')) {
      return 'RD';
    }
    if (lower.includes('convenio')) {
      return 'CI';
    }

    const stopwords = new Set([
      'de', 'del', 'la', 'el', 'los', 'las', 'en', 'y', 'para', 'a', 'con', 'por', 'sobre', 'al', 'o', 'e', 'un', 'una', 'unos', 'unas'
    ]);
    const palabras = clean
      .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '')
      .split(/\s+/)
      .filter(p => p.length > 0 && !stopwords.has(p.toLowerCase()));

    if (palabras.length === 0) return 'DOC';
    if (palabras.length === 1) return palabras[0].substring(0, 3).toUpperCase();

    return palabras.map(p => p[0].toUpperCase()).join('');
  }

  /**
   * Obtiene todos los IDs de sub-unidades descendientes (hijos, nietos, etc.) de una unidad.
   */
  function obtenerDescendientesUnidad(idUnidadBase, todasLasUnidades) {
    const descendientes = [];
    const visitados = new Set([Number(idUnidadBase)]);
    const cola = [Number(idUnidadBase)];

    while (cola.length > 0) {
      const actual = cola.shift();
      const hijos = todasLasUnidades.filter(u => Number(u.fid_unidad_padre) === actual);
      for (const h of hijos) {
        const hid = Number(h.id_unidad);
        if (!visitados.has(hid)) {
          visitados.add(hid);
          descendientes.push(h);
          cola.push(hid);
        }
      }
    }
    return descendientes;
  }

  /**
   * Resuelve de forma centralizada la jerarquía y permisos de Archivo del usuario autenticado.
   * Reglas institucionales:
   * 1. Archivo General: Solo MAE, Secretaría, Admin o usuario con submenú 'archivo/general' (id_menu 37) habilitado.
   * 2. Archivo de Unidad: Solo miembros con rango Jefe/Subjefe (o MAE/Admin o submenú 'archivo/unidad' habilitado).
   *    - Jefe de Unidad Padre: ve documentos de su unidad padre + sub-unidades hijas agrupadas.
   *    - Jefe/Subjefe de Unidad Hija: ve estrictamente su unidad hija (nunca la unidad padre ni hermanas).
   * 3. Archivo Institucional: Visible para TODO el personal sin excepción.
   *    - Elevar/Promover documento a Institucional: Solo Jefe de Unidad Padre o MAE (y Admin).
   *    - Cargar documento externo a Institucional: Solo MAE o Secretaría (y Admin).
   */
  async function resolverContextoPermisosArchivo(req) {
    const audit = req.body?.audit_usuario || req.user || {};
    const idUsuario = Number(audit.id_usuario || 1);

    const [usuarioDb, todasUnidades, rolesUsuarioDb] = await Promise.all([
      Usuario.findByPk(idUsuario, {
        include: [{ model: Unidad, as: 'unidad' }]
      }),
      Unidad.findAll({ where: { estado: 'ACTIVO' }, order: [['nombre', 'ASC']] }),
      UsuarioRol.findAll({
        where: { fid_usuario: idUsuario, estado: 'ACTIVO' },
        include: [{ model: Rol, as: 'rol' }]
      })
    ]);

    const nombresRoles = rolesUsuarioDb
      .map(ur => (ur.rol?.nombre || '').trim().toUpperCase())
      .filter(Boolean);

    const idsRoles = rolesUsuarioDb.map(ur => Number(ur.fid_rol)).filter(Boolean);

    let rutasMenusActivos = [];
    let idsMenusActivos = [];
    if (idsRoles.length > 0 && RolMenu && Menu) {
      const rolMenus = await RolMenu.findAll({
        where: { fid_rol: { [Op.in]: idsRoles }, estado: 'ACTIVO' },
        include: [{ model: Menu, as: 'menu' }]
      });
      idsMenusActivos = rolMenus.map(rm => Number(rm.fid_menu));
      rutasMenusActivos = rolMenus
        .map(rm => (rm.menu?.ruta || '').trim().toLowerCase())
        .filter(Boolean);
    }

    const username = (usuarioDb?.usuario || audit.usuario || '').toLowerCase();
    const cargo = (usuarioDb?.cargo || audit.cargo || '').trim();
    const esAdmin = nombresRoles.includes('ADMIN') || username === 'admin' || username === 'sys_default';
    const esMae = Boolean(usuarioDb?.es_mae) || nombresRoles.includes('MAE') || /\b(mae|presidente|directora?\s+general)\b/i.test(cargo);
    const esSecretaria = nombresRoles.includes('SECRETARIA') || /\bsecretar(ia|io|ía)\b/i.test(cargo);
    const esCorrespondencia = nombresRoles.includes('CORRESPONDENCIA');

    const regexRangoJefe = /\b(jefe|subjefe|sub\s*jefe|responsable|director|directora|presidente|presidenta|gerente|encargado|encargada|coordinador|coordinadora)\b/i;
    const esJefeOSubjefe = nombresRoles.includes('JEFE') || regexRangoJefe.test(cargo);

    const idUnidadUsuario = Number(usuarioDb?.fid_unidad || audit.fid_unidad || 0);
    const unidadActual = todasUnidades.find(u => Number(u.id_unidad) === idUnidadUsuario) || null;
    const hijosDirectos = idUnidadUsuario
      ? todasUnidades.filter(u => Number(u.fid_unidad_padre) === idUnidadUsuario)
      : [];
    const descendientes = idUnidadUsuario
      ? obtenerDescendientesUnidad(idUnidadUsuario, todasUnidades)
      : [];

    const esUnidadPadre = Boolean(unidadActual && (!unidadActual.fid_unidad_padre || hijosDirectos.length > 0));
    const esUnidadHija = Boolean(unidadActual && unidadActual.fid_unidad_padre);

    // Submenú habilitado explícitamente desde admin en rol_menu (para roles distintos de los predeterminados)
    const tieneSubmenuGeneralExplicito = idsMenusActivos.includes(37) || rutasMenusActivos.includes('archivo/general');
    const tieneSubmenuUnidadExplicito = idsMenusActivos.includes(38) || rutasMenusActivos.includes('archivo/unidad');

    // 1. Archivo General: MAE, Secretaría, Admin o habilitado por submenú
    const puedeVerArchivoGeneral = esMae || esSecretaria || esAdmin || tieneSubmenuGeneralExplicito;

    // 2. Archivo de Unidad: Jefe/Subjefe de unidad, MAE, Admin o habilitado por submenú
    const puedeVerArchivoUnidad = esMae || esAdmin || esJefeOSubjefe || tieneSubmenuUnidadExplicito;

    // 3. Archivo Institucional: Todo el personal sin excepción
    const puedeVerArchivoInstitucional = true;

    // 4. Elevar documento a Archivo Institucional: Solo Jefe Padre o MAE (o Admin)
    const esJefePadre = esJefeOSubjefe && esUnidadPadre;
    const puedePromoverInstitucional = esMae || esAdmin || esJefePadre;

    // 5. Cargar documento externo a Archivo Institucional: Solo MAE o Secretaría (o Admin)
    const puedeCargarExternoInstitucional = esMae || esSecretaria || esAdmin;

    // 6. Etiquetar / clasificar documentos
    const puedeEtiquetar = esMae || esSecretaria || esAdmin || esJefeOSubjefe || esCorrespondencia;

    return {
      idUsuario,
      usuario: usuarioDb,
      cargo,
      roles: nombresRoles,
      esAdmin,
      esMae,
      esSecretaria,
      esJefeOSubjefe,
      esJefePadre,
      idUnidadUsuario,
      unidadActual,
      esUnidadPadre,
      esUnidadHija,
      hijosDirectos,
      descendientes,
      todasUnidades,
      puedeVerArchivoGeneral,
      puedeVerArchivoUnidad,
      puedeVerArchivoInstitucional,
      puedePromoverInstitucional,
      puedeCargarExternoInstitucional,
      puedeEtiquetar
    };
  }

  /**
   * Normaliza el canal de origen de un documento para etiquetado y estadísticas.
   */
  function resolverOrigenDocumento(doc) {
    const orig = (doc.origen_radicacion || '').toUpperCase().trim();
    if (orig === 'EXTERNA' || orig === 'VENTANILLA_EXTERNA') return 'VENTANILLA_EXTERNA';
    if (orig === 'INTERNA' || orig === 'VENTANILLA_INTERNA') return 'VENTANILLA_INTERNA';
    if (doc.es_institucional) return 'INSTITUCIONAL';
    return 'FLUJO_INTERNO';
  }

  /**
   * Extrae las etiquetas (tags) de un documento combinando etiquetas manuales y automáticas.
   */
  function normalizarEtiquetasDoc(doc) {
    let manuales = [];
    if (Array.isArray(doc.etiquetas)) {
      manuales = doc.etiquetas;
    } else if (typeof doc.etiquetas === 'string' && doc.etiquetas.trim().startsWith('[')) {
      try { manuales = JSON.parse(doc.etiquetas); } catch (_) {}
    }
    return Array.from(new Set(manuales.map(t => String(t).trim()).filter(Boolean)));
  }

  /**
   * GET /api/v1/archivo/permisos
   * Devuelve los permisos jerárquicos exactos del usuario actual sobre los 3 niveles de Archivo.
   */
  app.get('/api/v1/archivo/permisos', async (req, res) => {
    try {
      const ctx = await resolverContextoPermisosArchivo(req);
      res.status(200).send(util.formatearMensaje("EXITO", "Permisos de archivo obtenidos.", {
        id_usuario: ctx.idUsuario,
        cargo: ctx.cargo,
        roles: ctx.roles,
        es_mae: ctx.esMae,
        es_secretaria: ctx.esSecretaria,
        es_jefe_o_subjefe: ctx.esJefeOSubjefe,
        es_jefe_padre: ctx.esJefePadre,
        es_unidad_padre: ctx.esUnidadPadre,
        es_unidad_hija: ctx.esUnidadHija,
        unidad: ctx.unidadActual ? {
          id_unidad: ctx.unidadActual.id_unidad,
          nombre: ctx.unidadActual.nombre,
          abreviacion: ctx.unidadActual.abreviacion,
          fid_unidad_padre: ctx.unidadActual.fid_unidad_padre
        } : null,
        sub_unidades_count: ctx.descendientes.length,
        permisos: {
          ver_archivo_general: ctx.puedeVerArchivoGeneral,
          ver_archivo_unidad: ctx.puedeVerArchivoUnidad,
          ver_archivo_institucional: ctx.puedeVerArchivoInstitucional,
          promover_a_institucional: ctx.puedePromoverInstitucional,
          cargar_externo_institucional: ctx.puedeCargarExternoInstitucional,
          etiquetar_documentos: ctx.puedeEtiquetar
        },
        etiquetas_sugeridas: ETIQUETAS_SUGERIDAS
      }));
    } catch (error) {
      res.status(412).send(util.formatearMensaje("ERROR", error.message || error));
    }
  });

  /**
   * GET /api/v1/archivo/general
   * Exclusivo para MAE, Secretaría, Admin o personal con el submenú habilitado.
   * Incluye clasificación multidimensional por etiquetas: Unidad, Tipo, Clasificación, Origen y Tags.
   */
  app.get('/api/v1/archivo/general', async (req, res) => {
    try {
      const ctx = await resolverContextoPermisosArchivo(req);
      if (!ctx.puedeVerArchivoGeneral) {
        return res.status(403).send(
          util.formatearMensaje(
            "ERROR",
            "Acceso restringido: El Archivo General solo está habilitado para rango MAE, Secretaría o usuarios autorizados por Administración."
          )
        );
      }

      const unidades = ctx.todasUnidades;

      // Obtener todos los documentos cerrados con CITE o radicados por ventanilla concluidos
      const docsRaw = await Documento.findAll({
        attributes: { exclude: ['archivo_adjunto'] },
        where: {
          estado: 'CERRADO',
          [Op.or]: [
            { nombre: { [Op.like]: '%/%' } },
            { codigo_hoja_ruta: { [Op.ne]: null } }
          ]
        },
        include: [
          {
            model: Usuario,
            as: 'usuario_creacion',
            attributes: ['id_usuario', 'nombres', 'apellidos', 'cargo', 'fid_unidad'],
            include: [{ model: Unidad, as: 'unidad', attributes: ['id_unidad', 'nombre', 'abreviacion', 'fid_unidad_padre'] }]
          }
        ],
        order: [['_fecha_creacion', 'DESC']]
      });

      const tiposSet = new Set();
      const clasificacionesMap = {};
      const origenesMap = {};
      const etiquetasMap = {};

      const docs = docsRaw.map(d => {
        const plain = d.toJSON();
        const tipo = (plain.nombre_plantilla || 'Documento Oficial').trim();
        const clasificacion = (plain.clasificacion || 'Reservado').trim();
        const origen = resolverOrigenDocumento(plain);
        const etiquetas = normalizarEtiquetasDoc(plain);

        plain.nombre_plantilla = tipo;
        plain.clasificacion = clasificacion;
        plain.origen_canal = origen;
        plain.etiquetas = etiquetas;

        tiposSet.add(tipo);
        clasificacionesMap[clasificacion] = (clasificacionesMap[clasificacion] || 0) + 1;
        origenesMap[origen] = (origenesMap[origen] || 0) + 1;
        etiquetas.forEach(tag => {
          etiquetasMap[tag] = (etiquetasMap[tag] || 0) + 1;
        });

        return plain;
      });

      const tiposDisponibles = Array.from(tiposSet).sort();

      // Construir estructura de unidades jerárquica (identificando padres e hijas)
      const resultadoUnidades = unidades.map(u => {
        const uPlain = u.toJSON();
        const hijos = obtenerDescendientesUnidad(u.id_unidad, unidades);
        const idsHijos = hijos.map(h => Number(h.id_unidad));

        const docsUnidadPropios = docs.filter(d => d.usuario_creacion && Number(d.usuario_creacion.fid_unidad) === Number(u.id_unidad));
        const docsSubUnidades = docs.filter(d => d.usuario_creacion && idsHijos.includes(Number(d.usuario_creacion.fid_unidad)));

        const agrupadoPorTipo = {};
        const agrupadoPorClasificacion = {};
        docsUnidadPropios.forEach(d => {
          const t = d.nombre_plantilla || 'Documento Oficial';
          if (!agrupadoPorTipo[t]) agrupadoPorTipo[t] = [];
          agrupadoPorTipo[t].push(d);

          const c = d.clasificacion || 'Reservado';
          if (!agrupadoPorClasificacion[c]) agrupadoPorClasificacion[c] = [];
          agrupadoPorClasificacion[c].push(d);
        });

        uPlain.es_unidad_padre = !u.fid_unidad_padre || idsHijos.length > 0;
        uPlain.sub_unidades_ids = idsHijos;
        uPlain.total_documentos = docsUnidadPropios.length;
        uPlain.total_con_hijos = docsUnidadPropios.length + docsSubUnidades.length;
        uPlain.documentos = docsUnidadPropios;
        uPlain.agrupado_por_tipo = agrupadoPorTipo;
        uPlain.agrupado_por_clasificacion = agrupadoPorClasificacion;
        return uPlain;
      });

      res.status(200).send(util.formatearMensaje("EXITO", "Archivo general obtenido exitosamente.", {
        total_documentos: docs.length,
        tipos_disponibles: tiposDisponibles,
        clasificaciones_disponibles: Object.keys(clasificacionesMap).map(k => ({ nombre: k, total: clasificacionesMap[k] })),
        origenes_disponibles: Object.keys(origenesMap).map(k => ({ codigo: k, total: origenesMap[k] })),
        etiquetas_disponibles: Object.keys(etiquetasMap).map(k => ({ tag: k, total: etiquetasMap[k] })),
        etiquetas_sugeridas: ETIQUETAS_SUGERIDAS,
        unidades: resultadoUnidades,
        documentos: docs
      }));
    } catch (error) {
      res.status(412).send(util.formatearMensaje("ERROR", error.message || error));
    }
  });

  /**
   * GET /api/v1/archivo/unidad/:id_unidad
   * Obtiene el archivo de una unidad respetando estrictamente la jerarquía Padre vs. Hijo:
   * - Solo miembros con rango Jefe/Subjefe (o MAE/Admin) pueden consultar el Archivo de Unidad.
   * - Jefe de Unidad Padre: ve todos los documentos de su unidad padre + los de sus unidades hijas agrupados.
   * - Jefe/Subjefe de Unidad Hija: solo puede ver los documentos de su propia unidad hija (jamás los de la unidad padre ni de otra unidad).
   */
  app.get('/api/v1/archivo/unidad/:id_unidad', async (req, res) => {
    try {
      const ctx = await resolverContextoPermisosArchivo(req);
      if (!ctx.puedeVerArchivoUnidad) {
        return res.status(403).send(
          util.formatearMensaje(
            "ERROR",
            "Acceso restringido: El Archivo de Unidad solo puede ser visualizado por miembros con rango Jefe o Subjefe de la unidad."
          )
        );
      }

      let idUnidadSolicitada = parseInt(req.params.id_unidad, 10);
      if (isNaN(idUnidadSolicitada) || idUnidadSolicitada <= 0) {
        idUnidadSolicitada = ctx.idUnidadUsuario || 1;
      }

      // Aislar estrictamente a Jefes/Subjefes que NO son MAE ni Admin:
      // Solo pueden consultar su propia unidad o una sub-unidad descendiente de la suya;
      // NUNCA pueden consultar la unidad padre ni otra unidad hermana.
      if (!ctx.esMae && !ctx.esAdmin && ctx.idUnidadUsuario) {
        const idsPermitidos = new Set([
          Number(ctx.idUnidadUsuario),
          ...ctx.descendientes.map(d => Number(d.id_unidad))
        ]);
        if (!idsPermitidos.has(idUnidadSolicitada)) {
          idUnidadSolicitada = Number(ctx.idUnidadUsuario);
        }
      }

      const unidadPrincipal = await Unidad.findByPk(idUnidadSolicitada);
      if (!unidadPrincipal) {
        return res.status(404).send(util.formatearMensaje("ERROR", "Unidad no encontrada."));
      }

      // Determinar sub-unidades hijas descendientes de esta unidad
      // Si la unidad consultada es una unidad hija sin descendientes, subUnidades será []
      const subUnidades = obtenerDescendientesUnidad(idUnidadSolicitada, ctx.todasUnidades);
      const todasUnidadesIds = [idUnidadSolicitada, ...subUnidades.map(s => Number(s.id_unidad))];

      const matchJsonUnidadArray = (col, ids) => {
        const conds = [];
        for (const uId of ids) {
          conds.push({ [col]: { [Op.like]: `[${uId}]` } });
          conds.push({ [col]: { [Op.like]: `[${uId},%` } });
          conds.push({ [col]: { [Op.like]: `%,${uId},%` } });
          conds.push({ [col]: { [Op.like]: `%,${uId}]` } });
          conds.push({ [col]: { [Op.like]: `%"${uId}"%` } });
        }
        return conds;
      };

      const docsRaw = await Documento.findAll({
        attributes: { exclude: ['archivo_adjunto'] },
        where: {
          estado: 'CERRADO',
          nombre: { [Op.like]: '%/%' },
          [Op.or]: [
            { '$usuario_creacion.fid_unidad$': { [Op.in]: todasUnidadesIds } },
            ...matchJsonUnidadArray('copia', todasUnidadesIds)
          ]
        },
        include: [
          {
            model: Usuario,
            as: 'usuario_creacion',
            attributes: ['id_usuario', 'nombres', 'apellidos', 'cargo', 'fid_unidad'],
            required: false,
            include: [{ model: Unidad, as: 'unidad', attributes: ['id_unidad', 'nombre', 'abreviacion', 'fid_unidad_padre'] }]
          }
        ],
        order: [['_fecha_creacion', 'DESC']]
      });

      const docs = docsRaw.map(d => {
        const plain = d.toJSON();
        plain.nombre_plantilla = (plain.nombre_plantilla || 'Documento Oficial').trim();
        plain.clasificacion = (plain.clasificacion || 'Reservado').trim();
        plain.origen_canal = resolverOrigenDocumento(plain);
        plain.etiquetas = normalizarEtiquetasDoc(plain);
        return plain;
      });

      const tiposSet = new Set();
      const clasificacionesSet = new Set();
      docs.forEach(d => {
        tiposSet.add(d.nombre_plantilla);
        clasificacionesSet.add(d.clasificacion);
      });

      const esCopiaParaUnidad = (d, uId) => {
        if (!d.copia) return false;
        try {
          const arr = Array.isArray(d.copia) ? d.copia : JSON.parse(d.copia);
          return (Array.isArray(arr) ? arr : [arr]).map(Number).includes(Number(uId));
        } catch (_) {
          return String(d.copia).includes(`[${uId}]`) || String(d.copia).includes(`"${uId}"`);
        }
      };

      // Documentos propios de la unidad consultada
      const docsPropios = docs.filter(d => d.usuario_creacion && Number(d.usuario_creacion.fid_unidad) === Number(idUnidadSolicitada));
      const propiosPorTipo = {};
      const propiosPorClasificacion = {};
      docsPropios.forEach(d => {
        const t = d.nombre_plantilla;
        if (!propiosPorTipo[t]) propiosPorTipo[t] = [];
        propiosPorTipo[t].push(d);

        const c = d.clasificacion;
        if (!propiosPorClasificacion[c]) propiosPorClasificacion[c] = [];
        propiosPorClasificacion[c].push(d);
      });

      // Documentos recibidos en copia (CC)
      const docsCopia = docs.filter(d => esCopiaParaUnidad(d, idUnidadSolicitada) && (!d.usuario_creacion || Number(d.usuario_creacion.fid_unidad) !== Number(idUnidadSolicitada)));
      const copiaPorTipo = {};
      docsCopia.forEach(d => {
        const t = d.nombre_plantilla;
        if (!copiaPorTipo[t]) copiaPorTipo[t] = [];
        copiaPorTipo[t].push(d);
      });

      // Mapear sub-unidades dependientes con sus propios documentos y agrupaciones
      let totalDocsSubUnidades = 0;
      const subUnidadesMapeadas = subUnidades.map(sub => {
        const subPlain = sub.toJSON ? sub.toJSON() : { ...sub };
        const subDocs = docs.filter(d => d.usuario_creacion && Number(d.usuario_creacion.fid_unidad) === Number(sub.id_unidad));
        const subPorTipo = {};
        const subPorClasificacion = {};
        subDocs.forEach(d => {
          const t = d.nombre_plantilla;
          if (!subPorTipo[t]) subPorTipo[t] = [];
          subPorTipo[t].push(d);

          const c = d.clasificacion;
          if (!subPorClasificacion[c]) subPorClasificacion[c] = [];
          subPorClasificacion[c].push(d);
        });
        totalDocsSubUnidades += subDocs.length;
        subPlain.documentos = subDocs;
        subPlain.agrupado_por_tipo = subPorTipo;
        subPlain.agrupado_por_clasificacion = subPorClasificacion;
        subPlain.total_documentos = subDocs.length;
        return subPlain;
      });

      const unidadPadreInfo = unidadPrincipal.fid_unidad_padre
        ? ctx.todasUnidades.find(u => Number(u.id_unidad) === Number(unidadPrincipal.fid_unidad_padre))
        : null;

      res.status(200).send(util.formatearMensaje("EXITO", "Archivo de unidad obtenido exitosamente.", {
        unidad: unidadPrincipal,
        es_unidad_padre: !unidadPrincipal.fid_unidad_padre || subUnidades.length > 0,
        es_unidad_hija: Boolean(unidadPrincipal.fid_unidad_padre),
        unidad_padre_nombre: unidadPadreInfo ? unidadPadreInfo.nombre : null,
        rango_usuario: ctx.esMae ? 'MAE' : (ctx.esJefePadre ? 'JEFE_UNIDAD_PADRE' : 'JEFE_UNIDAD_HIJA'),
        total_documentos: docsPropios.length + docsCopia.length + totalDocsSubUnidades,
        total_propios: docsPropios.length,
        total_copia: docsCopia.length,
        total_sub_unidades: totalDocsSubUnidades,
        tipos_disponibles: Array.from(tiposSet).sort(),
        clasificaciones_disponibles: Array.from(clasificacionesSet).sort(),
        documentos_propios: docsPropios,
        documentos_copia: docsCopia,
        agrupado_por_tipo: propiosPorTipo,
        agrupado_por_clasificacion: propiosPorClasificacion,
        agrupado_por_tipo_copia: copiaPorTipo,
        sub_unidades: subUnidadesMapeadas
      }));
    } catch (error) {
      res.status(412).send(util.formatearMensaje("ERROR", error.message || error));
    }
  });

  /**
   * GET /api/v1/archivo/institucional
   * Visible para TODO el personal del sistema sin excepción.
   */
  app.get('/api/v1/archivo/institucional', async (req, res) => {
    try {
      const docsRaw = await Documento.findAll({
        attributes: { exclude: ['archivo_adjunto'] },
        where: {
          es_institucional: true,
          estado: { [Op.ne]: 'ELIMINADO' }
        },
        include: [
          {
            model: Usuario,
            as: 'usuario_creacion',
            attributes: ['id_usuario', 'nombres', 'apellidos', 'cargo', 'fid_unidad'],
            include: [{ model: Unidad, as: 'unidad', attributes: ['id_unidad', 'nombre', 'abreviacion'] }]
          }
        ],
        order: [['_fecha_creacion', 'DESC']]
      });

      const docs = docsRaw.map(d => {
        const plain = d.toJSON();
        plain.etiquetas = normalizarEtiquetasDoc(plain);
        return plain;
      });

      res.status(200).send(util.formatearMensaje("EXITO", "Documentos de archivo institucional obtenidos exitosamente.", {
        total: docs.length,
        resultado: docs
      }));
    } catch (error) {
      res.status(412).send(util.formatearMensaje("ERROR", error.message || error));
    }
  });

  /**
   * POST /api/v1/archivo/promover/:id_documento
   * SOLO rango Jefe de Unidad Padre o MAE (o Admin) puede elevar un documento a Archivo Institucional.
   */
  app.post('/api/v1/archivo/promover/:id_documento', async (req, res) => {
    try {
      const ctx = await resolverContextoPermisosArchivo(req);
      if (!ctx.puedePromoverInstitucional) {
        return res.status(403).send(
          util.formatearMensaje(
            "ERROR",
            "Permiso denegado: Solo una Autoridad MAE o un Jefe de Unidad Padre puede elevar documentos al Archivo Institucional."
          )
        );
      }

      const idDoc = parseInt(req.params.id_documento, 10);
      const auditUser = req.body.audit_usuario || req.user || {};

      const doc = await Documento.findByPk(idDoc);
      if (!doc) {
        return res.status(404).send(util.formatearMensaje("ERROR", "Documento no encontrado."));
      }

      const versionInicial = (doc.versiones && doc.versiones.length > 0) ? doc.versiones : [
        {
          version: 1,
          nombre_archivo: `${doc.nombre}.pdf`,
          ruta: `/api/v1/documento/${doc.id_documento}/pdf`,
          fecha: doc._fecha_creacion || new Date(),
          usuario: auditUser.nombres || ctx.usuario?.nombres || 'Autoridad',
          observacion: `Elevado a Archivo Institucional por ${ctx.usuario?.nombres || ''} ${ctx.usuario?.apellidos || ''} (${ctx.cargo || 'Jefatura/MAE'})`
        }
      ];

      await doc.update({
        es_institucional: true,
        alcance_archivo: 'INSTITUCIONAL',
        categoria_institucional: req.body.categoria || doc.nombre_plantilla || 'Resolución / Normativa',
        versiones: versionInicial,
        _usuario_modificacion: ctx.idUsuario || 1
      });

      setImmediate(() => {
        notificar.enviarDifusionGlobal(app.src.db.models, doc, {});
      });

      res.status(200).send(util.formatearMensaje("EXITO", "Documento elevado a Archivo Institucional con éxito.", doc));
    } catch (error) {
      res.status(412).send(util.formatearMensaje("ERROR", error.message || error));
    }
  });

  /**
   * POST /api/v1/archivo/etiquetas/:id_documento
   * Actualiza las etiquetas (tags) y/o clasificación de un documento en el Archivo.
   */
  app.post('/api/v1/archivo/etiquetas/:id_documento', async (req, res) => {
    try {
      const ctx = await resolverContextoPermisosArchivo(req);
      if (!ctx.puedeEtiquetar) {
        return res.status(403).send(util.formatearMensaje("ERROR", "No tiene permisos para modificar etiquetas de archivo."));
      }

      const idDoc = parseInt(req.params.id_documento, 10);
      const doc = await Documento.findByPk(idDoc);
      if (!doc) {
        return res.status(404).send(util.formatearMensaje("ERROR", "Documento no encontrado."));
      }

      const etiquetasRaw = Array.isArray(req.body.etiquetas) ? req.body.etiquetas : [];
      const etiquetasLimpias = Array.from(
        new Set(etiquetasRaw.map(t => String(t).trim()).filter(Boolean))
      );

      const camposActualizar = {
        etiquetas: etiquetasLimpias,
        _usuario_modificacion: ctx.idUsuario
      };

      if (req.body.clasificacion && ['Reservado', 'Secreto', 'Confidencial', 'Desclasificado'].includes(req.body.clasificacion)) {
        camposActualizar.clasificacion = req.body.clasificacion;
      }

      await doc.update(camposActualizar);

      res.status(200).send(util.formatearMensaje("EXITO", "Etiquetas y clasificación actualizadas.", {
        id_documento: doc.id_documento,
        etiquetas: etiquetasLimpias,
        clasificacion: doc.clasificacion
      }));
    } catch (error) {
      res.status(412).send(util.formatearMensaje("ERROR", error.message || error));
    }
  });

  /**
   * GET /api/v1/archivo/estadisticas
   * Genera estadísticas detalladas de Ventanilla Externa, Ventanilla Interna y Archivo Documental.
   */
  app.get('/api/v1/archivo/estadisticas', async (req, res) => {
    try {
      const anioFiltro = req.query.anio ? String(req.query.anio) : null;
      const docsRaw = await Documento.findAll({
        attributes: [
          'id_documento', 'nombre', 'nombre_plantilla', 'abreviacion', 'estado',
          'clasificacion', 'es_institucional', 'categoria_institucional',
          'codigo_hoja_ruta', 'origen_radicacion', 'datos_remitente',
          'etiquetas', 'para', '_usuario_creacion', '_fecha_creacion', 'fecha'
        ],
        where: {
          estado: { [Op.ne]: 'ELIMINADO' }
        },
        include: [
          {
            model: Usuario,
            as: 'usuario_creacion',
            attributes: ['id_usuario', 'nombres', 'apellidos', 'fid_unidad'],
            include: [{ model: Unidad, as: 'unidad', attributes: ['id_unidad', 'nombre', 'abreviacion'] }]
          }
        ],
        order: [['_fecha_creacion', 'DESC']]
      });

      const unidades = await Unidad.findAll({ where: { estado: 'ACTIVO' }, order: [['nombre', 'ASC']] });
      const usuarios = await Usuario.findAll({ attributes: ['id_usuario', 'fid_unidad'] });
      const mapaUsuarioUnidad = new Map(usuarios.map(u => [Number(u.id_usuario), Number(u.fid_unidad)]));

      // Filtrar por año si se especificó
      const docs = anioFiltro
        ? docsRaw.filter(d => {
            const f = d._fecha_creacion || d.fecha;
            return f && String(new Date(f).getFullYear()) === anioFiltro;
          })
        : docsRaw;

      const resumenCanales = {
        ventanilla_externa: { total: 0, pendientes: 0, en_curso: 0, atendidos: 0 },
        ventanilla_interna: { total: 0, pendientes: 0, en_curso: 0, atendidos: 0 },
        flujo_interno: { total: 0, borradores: 0, en_curso: 0, cerrados: 0 },
        institucional: { total: 0 }
      };

      const porTipoTramiteVentanilla = {};
      const porPrioridadVentanilla = { NORMAL: 0, URGENTE: 0, 'MUY URGENTE': 0 };
      const porClasificacion = { Reservado: 0, Secreto: 0, Confidencial: 0, Desclasificado: 0 };
      const porTipoDocumento = {};
      const porEtiqueta = {};
      const porMes = Array.from({ length: 12 }, (_, i) => ({
        mes: i + 1,
        nombre_mes: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][i],
        ventanilla_externa: 0,
        ventanilla_interna: 0,
        flujo_interno: 0
      }));

      const statsUnidadesMap = new Map();
      unidades.forEach(u => {
        statsUnidadesMap.set(Number(u.id_unidad), {
          id_unidad: u.id_unidad,
          nombre: u.nombre,
          abreviacion: u.abreviacion,
          fid_unidad_padre: u.fid_unidad_padre,
          producidos_cerrados: 0,
          ventanilla_externa_recibidos: 0,
          ventanilla_interna_recibidos: 0,
          ventanilla_atendidos: 0,
          ventanilla_pendientes: 0,
          total_movimiento: 0
        });
      });

      docs.forEach(d => {
        const plain = d.toJSON();
        const orig = (plain.origen_radicacion || '').toUpperCase().trim();
        const esVentExterna = orig === 'EXTERNA' || orig === 'VENTANILLA_EXTERNA';
        const esVentInterna = orig === 'INTERNA' || orig === 'VENTANILLA_INTERNA';
        const esVentanilla = esVentExterna || esVentInterna || Boolean(plain.codigo_hoja_ruta);

        const fechaDoc = plain._fecha_creacion || plain.fecha;
        const mesIdx = fechaDoc ? new Date(fechaDoc).getMonth() : -1;

        // Clasificación
        const clasif = plain.clasificacion || 'Reservado';
        porClasificacion[clasif] = (porClasificacion[clasif] || 0) + 1;

        // Tipo de documento
        const tipoDoc = (plain.nombre_plantilla || 'Documento Oficial').trim();
        porTipoDocumento[tipoDoc] = (porTipoDocumento[tipoDoc] || 0) + 1;

        // Etiquetas
        const tags = normalizarEtiquetasDoc(plain);
        tags.forEach(t => {
          porEtiqueta[t] = (porEtiqueta[t] || 0) + 1;
        });

        if (plain.es_institucional) {
          resumenCanales.institucional.total++;
        }

        if (esVentanilla) {
          const bucket = esVentExterna ? resumenCanales.ventanilla_externa : resumenCanales.ventanilla_interna;
          bucket.total++;
          if (plain.estado === 'CERRADO' || plain.estado === 'APROBADO') {
            bucket.atendidos++;
          } else if (plain.estado === 'NUEVO') {
            bucket.pendientes++;
          } else {
            bucket.en_curso++;
          }

          if (mesIdx >= 0 && mesIdx < 12) {
            if (esVentExterna) porMes[mesIdx].ventanilla_externa++;
            else porMes[mesIdx].ventanilla_interna++;
          }

          const rem = plain.datos_remitente || {};
          const tipoTramite = (rem.tipoTramite || rem.categoria || plain.nombre_plantilla || 'Trámite General').trim().toUpperCase();
          porTipoTramiteVentanilla[tipoTramite] = (porTipoTramiteVentanilla[tipoTramite] || 0) + 1;

          const prio = (rem.prioridad || 'NORMAL').trim().toUpperCase();
          porPrioridadVentanilla[prio] = (porPrioridadVentanilla[prio] || 0) + 1;

          // Identificar unidad destino en 'para'
          let idUnidadDestino = null;
          if (plain.para) {
            try {
              const arrPara = typeof plain.para === 'string' ? JSON.parse(plain.para) : plain.para;
              const primerDest = Array.isArray(arrPara) ? Number(arrPara[0]) : Number(arrPara);
              if (primerDest && mapaUsuarioUnidad.has(primerDest)) {
                idUnidadDestino = mapaUsuarioUnidad.get(primerDest);
              }
            } catch (_) {}
          }
          if (!idUnidadDestino && plain.usuario_creacion?.fid_unidad) {
            idUnidadDestino = Number(plain.usuario_creacion.fid_unidad);
          }

          if (idUnidadDestino && statsUnidadesMap.has(idUnidadDestino)) {
            const st = statsUnidadesMap.get(idUnidadDestino);
            if (esVentExterna) st.ventanilla_externa_recibidos++;
            else st.ventanilla_interna_recibidos++;

            if (plain.estado === 'CERRADO' || plain.estado === 'APROBADO') {
              st.ventanilla_atendidos++;
            } else {
              st.ventanilla_pendientes++;
            }
            st.total_movimiento++;
          }
        } else {
          resumenCanales.flujo_interno.total++;
          if (plain.estado === 'CERRADO') {
            resumenCanales.flujo_interno.cerrados++;
          } else if (plain.estado === 'NUEVO') {
            resumenCanales.flujo_interno.borradores++;
          } else {
            resumenCanales.flujo_interno.en_curso++;
          }

          if (mesIdx >= 0 && mesIdx < 12 && plain.estado === 'CERRADO') {
            porMes[mesIdx].flujo_interno++;
          }

          const uProd = Number(plain.usuario_creacion?.fid_unidad || 0);
          if (uProd && statsUnidadesMap.has(uProd) && plain.estado === 'CERRADO') {
            const st = statsUnidadesMap.get(uProd);
            st.producidos_cerrados++;
            st.total_movimiento++;
          }
        }
      });

      res.status(200).send(util.formatearMensaje("EXITO", "Estadísticas documentales y de ventanilla generadas.", {
        resumen_canales: resumenCanales,
        ventanilla_por_tipo_tramite: Object.keys(porTipoTramiteVentanilla).map(k => ({
          tipo: k,
          total: porTipoTramiteVentanilla[k]
        })).sort((a, b) => b.total - a.total),
        ventanilla_por_prioridad: Object.keys(porPrioridadVentanilla).map(k => ({
          prioridad: k,
          total: porPrioridadVentanilla[k]
        })),
        por_clasificacion: Object.keys(porClasificacion).map(k => ({
          clasificacion: k,
          total: porClasificacion[k]
        })),
        por_tipo_documento: Object.keys(porTipoDocumento).map(k => ({
          tipo: k,
          total: porTipoDocumento[k]
        })).sort((a, b) => b.total - a.total),
        por_etiqueta: Object.keys(porEtiqueta).map(k => ({
          etiqueta: k,
          total: porEtiqueta[k]
        })).sort((a, b) => b.total - a.total),
        por_unidad: Array.from(statsUnidadesMap.values()),
        evolucion_mensual: porMes
      }));
    } catch (error) {
      res.status(412).send(util.formatearMensaje("ERROR", error.message || error));
    }
  });

  /**
   * GET /api/v1/archivo/institucional/proximo-cite
   */
  app.get('/api/v1/archivo/institucional/proximo-cite', async (req, res) => {
    try {
      const nombreDoc = req.query.nombre || '';
      let sigla = (req.query.sigla || '').trim().toUpperCase();
      const anio = String(req.query.anio || new Date().getFullYear());
      const entidad = 'MARABUNTA';

      if (!sigla && nombreDoc) {
        sigla = derivarSigla(nombreDoc);
      }
      if (!sigla) {
        sigla = 'DOC';
      }

      const abreviacionCite = `${entidad}/${sigla}`;
      const corr = await Correlativo.findOne({
        where: { abreviacion: abreviacionCite, anio: anio }
      });

      const proximoValor = corr ? corr.valor : 1;
      const citeGenerado = `${abreviacionCite}/${proximoValor}/${anio}`;

      res.status(200).send(util.formatearMensaje("EXITO", "Próximo CITE institucional calculado con éxito.", {
        cite: citeGenerado,
        entidad,
        sigla,
        correlativo: proximoValor,
        anio
      }));
    } catch (error) {
      res.status(412).send(util.formatearMensaje("ERROR", error.message || error));
    }
  });

  /**
   * POST /api/v1/archivo/institucional/cargar
   * SOLO MAE o Secretaría (o Admin) puede cargar un documento externo a Archivo Institucional.
   */
  app.post('/api/v1/archivo/institucional/cargar', async (req, res) => {
    try {
      const ctx = await resolverContextoPermisosArchivo(req);
      if (!ctx.puedeCargarExternoInstitucional) {
        return res.status(403).send(
          util.formatearMensaje(
            "ERROR",
            "Permiso denegado: Solo una Autoridad MAE o Secretaría puede cargar documentos externos al Archivo Institucional."
          )
        );
      }

      const {
        nombre_documento,
        descripcion,
        categoria,
        nombre_archivo,
        url_archivo,
        observacion,
        archivo_base64,
        archivo_adjunto,
        etiquetas
      } = req.body;
      let sigla = (req.body.sigla || '').trim().toUpperCase();
      const anio = String(req.body.anio || new Date().getFullYear());
      const entidad = 'MARABUNTA';
      const auditUser = req.body.audit_usuario || req.user || {};

      const tituloDoc = nombre_documento || req.body.referencia;
      const descDoc = descripcion || req.body.observacion || req.body.referencia || '';

      if (!tituloDoc) {
        return res.status(400).send(util.formatearMensaje("ERROR", "El nombre o título del documento institucional es obligatorio."));
      }

      if (!sigla) {
        sigla = derivarSigla(tituloDoc);
      }

      const abreviacionCite = `${entidad}/${sigla}`;

      let corr = await Correlativo.findOne({
        where: { abreviacion: abreviacionCite, anio: anio }
      });

      let numeroCorrelativo = 1;
      if (!corr) {
        corr = await Correlativo.create({
          abreviacion: abreviacionCite,
          anio: anio,
          valor: 2,
          _usuario_creacion: ctx.idUsuario || 1
        });
        numeroCorrelativo = 1;
      } else {
        numeroCorrelativo = corr.valor;
        await corr.update({
          valor: corr.valor + 1,
          _usuario_modificacion: ctx.idUsuario || 1
        });
      }

      const citeFinal = req.body.cite ? req.body.cite.trim().toUpperCase() : `${abreviacionCite}/${numeroCorrelativo}/${anio}`;
      const referenciaFinal = descDoc ? `${tituloDoc} - ${descDoc}` : tituloDoc;

      let rutaArchivoFisico = url_archivo || `/public/documentos/${citeFinal.replace(/\//g, '_')}.pdf`;
      const archivoData = archivo_base64 || archivo_adjunto;
      if (archivoData && typeof archivoData === 'string' && archivoData.includes('base64,')) {
        try {
          const base64Content = archivoData.split('base64,')[1];
          const buffer = Buffer.from(base64Content, 'base64');
          const dirDocs = path.resolve('./public/documentos');
          if (!fs.existsSync(dirDocs)) {
            fs.mkdirSync(dirDocs, { recursive: true });
          }
          const filePath = path.join(dirDocs, `${citeFinal.replace(/\//g, '_')}.pdf`);
          fs.writeFileSync(filePath, buffer);
          rutaArchivoFisico = `/public/documentos/${citeFinal.replace(/\//g, '_')}.pdf`;
        } catch (e) {
          console.error('[ARCHIVO INSTITUCIONAL] Error al guardar PDF en disco:', e);
        }
      }

      const versiones = [
        {
          version: 1,
          nombre_archivo: nombre_archivo || `${sigla}_v1.pdf`,
          ruta: rutaArchivoFisico,
          fecha: new Date(),
          usuario: ctx.usuario?.nombres ? `${ctx.usuario.nombres} ${ctx.usuario.apellidos || ''}`.trim() : (auditUser.nombres || 'Autoridad / Secretaría'),
          observacion: observacion || `Carga oficial de ${tituloDoc} en custodia institucional (v1)`
        }
      ];

      const todosActivos = await Usuario.findAll({ where: { estado: 'ACTIVO' }, attributes: ['id_usuario'] });
      const idsTodos = todosActivos.map(u => Number(u.id_usuario)).filter(n => n > 0);
      const alcanceFinal = req.body.alcance_archivo || 'INSTITUCIONAL';
      const etiquetasIniciales = Array.isArray(etiquetas) ? etiquetas : [categoria || 'Normativa'];

      const nuevoDoc = await Documento.create({
        nombre: citeFinal,
        referencia: referenciaFinal,
        nombre_plantilla: tituloDoc,
        abreviacion: sigla,
        categoria_institucional: categoria || 'DOCUMENTO INSTITUCIONAL',
        etiquetas: etiquetasIniciales,
        clasificacion: req.body.clasificacion || 'Desclasificado',
        archivo_adjunto: archivoData || null,
        de: JSON.stringify([ctx.idUsuario || 1]),
        para: JSON.stringify(idsTodos),
        alcance_archivo: alcanceFinal,
        plantilla: JSON.stringify({ tipo: 'institucional', nombre_documento: tituloDoc, sigla, descripcion: descDoc }),
        plantilla_valor: JSON.stringify({
          cite: citeFinal,
          nombre_documento: tituloDoc,
          sigla,
          descripcion: descDoc,
          ref: referenciaFinal,
          observacion: observacion || '',
          datosGenerales: {
            para: [{ id_usuario: 'TODOS', todos: true, nombres: 'A TODO EL PERSONAL', todos_ids: idsTodos }]
          }
        }),
        estado: 'CERRADO',
        es_institucional: alcanceFinal === 'INSTITUCIONAL',
        versiones: versiones,
        _usuario_creacion: ctx.idUsuario || 1,
        _usuario_modificacion: ctx.idUsuario || 1,
        fecha: new Date()
      });

      if (req.body.difundir_todos !== false) {
        setImmediate(() => {
          notificar.enviarDifusionGlobal(app.src.db.models, nuevoDoc, {});
        });
      }

      res.status(201).send(util.formatearMensaje("EXITO", "Documento oficial emitido y difundido exitosamente.", nuevoDoc));
    } catch (error) {
      res.status(412).send(util.formatearMensaje("ERROR", error.message || error));
    }
  });

  /**
   * GET /api/v1/archivo/whatsapp/grupos
   */
  app.get('/api/v1/archivo/whatsapp/grupos', async (req, res) => {
    try {
      const grupos = await whatsapp.obtenerGrupos();
      res.status(200).send(util.formatearMensaje("EXITO", "Grupos de WhatsApp obtenidos.", {
        grupo_configurado: process.env.WHATSAPP_GRUPO_ID || '',
        grupos
      }));
    } catch (error) {
      res.status(200).send(util.formatearMensaje("INFORMACION", "No se pudieron listar grupos (verifique conexión QR).", {
        grupo_configurado: process.env.WHATSAPP_GRUPO_ID || '',
        grupos: []
      }));
    }
  });

  /**
   * POST /api/v1/archivo/difundir/:id_documento
   */
  app.post('/api/v1/archivo/difundir/:id_documento', async (req, res) => {
    try {
      const idDoc = parseInt(req.params.id_documento, 10);
      const doc = await Documento.findByPk(idDoc);
      if (!doc) {
        return res.status(404).send(util.formatearMensaje("ERROR", "Documento no encontrado."));
      }
      await notificar.enviarDifusionGlobal(app.src.db.models, doc, {});
      res.status(200).send(util.formatearMensaje("EXITO", `Difusión global ejecutada para ${doc.nombre} (Correos masivos + Grupo de WhatsApp).`));
    } catch (error) {
      res.status(412).send(util.formatearMensaje("ERROR", error.message || error));
    }
  });

  /**
   * POST /api/v1/archivo/versionar/:id_documento
   */
  app.post('/api/v1/archivo/versionar/:id_documento', async (req, res) => {
    try {
      const idDoc = parseInt(req.params.id_documento, 10);
      const { observacion, nombre_archivo, url_archivo } = req.body;
      const auditUser = req.body.audit_usuario || req.user || {};

      const doc = await Documento.findByPk(idDoc);
      if (!doc) {
        return res.status(404).send(util.formatearMensaje("ERROR", "Documento no encontrado."));
      }

      let listaVersiones = Array.isArray(doc.versiones) ? [...doc.versiones] : [];
      if (listaVersiones.length === 0) {
        listaVersiones.push({
          version: 1,
          nombre_archivo: `${doc.nombre}_v1.pdf`,
          ruta: `/api/v1/documento/${doc.id_documento}/pdf`,
          fecha: doc._fecha_creacion || new Date(),
          usuario: 'Autor Original',
          observacion: 'Versión original de archivo'
        });
      }

      const siguienteVersion = listaVersiones.length + 1;
      const nuevaVersion = {
        version: siguienteVersion,
        nombre_archivo: nombre_archivo || `${doc.nombre}_v${siguienteVersion}.pdf`,
        ruta: url_archivo || `/api/v1/documento/${doc.id_documento}/pdf?v=${siguienteVersion}`,
        fecha: new Date(),
        usuario: `${auditUser.nombres || 'Usuario'} ${auditUser.apellidos || ''}`.trim(),
        observacion: observacion || `Nueva versión v${siguienteVersion} digitalizada`
      };

      listaVersiones.push(nuevaVersion);

      await doc.update({
        versiones: listaVersiones,
        _usuario_modificacion: auditUser.id_usuario || 1
      });

      res.status(200).send(util.formatearMensaje("EXITO", `Versión v${siguienteVersion} agregada con éxito a la trazabilidad.`, {
        id_documento: doc.id_documento,
        total_versiones: listaVersiones.length,
        versiones: listaVersiones
      }));
    } catch (error) {
      res.status(412).send(util.formatearMensaje("ERROR", error.message || error));
    }
  });

  /**
   * GET /api/v1/plantillasFormly/archivo/expediente/:id
   */
  app.get('/api/v1/plantillasFormly/archivo/expediente/:id', (req, res) => {
    const idParam = parseInt(req.params.id, 10);
    if (isNaN(idParam)) {
      return res.status(400).send(util.formatearMensaje("ERROR", "Identificador de documento o lote inválido."));
    }

    loteBL.obtenerExpedienteLote(Documento, HistorialFlujo, Usuario, Unidad, idParam)
      .then(expediente => {
        if (!expediente) {
          return res.status(404).send(util.formatearMensaje("INFORMACION", "No se encontró el expediente de trámite."));
        }
        res.status(200).send(util.formatearMensaje("EXITO", "Expediente de trámite obtenido correctamente.", expediente));
      })
      .catch(error => {
        res.status(412).send(util.formatearMensaje("ERROR", error.message || error));
      });
  });

  /**
   * POST /api/v1/plantillasFormly/archivo/procesar_lote
   */
  app.post('/api/v1/plantillasFormly/archivo/procesar_lote', (req, res) => {
    const { id_documento, documento_padre, cites_referidos } = req.body;
    if (!id_documento) {
      return res.status(400).send(util.formatearMensaje("ERROR", "id_documento es requerido."));
    }

    loteBL.procesarLote(Documento, id_documento, documento_padre, cites_referidos)
      .then(resultado => {
        res.status(200).send(util.formatearMensaje("EXITO", "Lote procesado y fusionado correctamente.", resultado));
      })
      .catch(error => {
        res.status(412).send(util.formatearMensaje("ERROR", error.message || error));
      });
  });
};
