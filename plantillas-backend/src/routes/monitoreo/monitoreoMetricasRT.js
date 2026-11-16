'use strict';

/**
 * Rutas de Métricas Inteligentes y Monitoreo Multinivel
 * Provee agregaciones de alto rendimiento para Apache ECharts:
 * - Visión Global (MAE y Administradores)
 * - Visión de Unidad (Jefaturas)
 * - Visión Individual (Auto-Monitoreo y Productividad del Funcionario)
 * - Overview Ejecutivo para Home Dashboard
 */

const moment = require('moment');
const logger = require('../../lib/logger');
const util = require('../../lib/util');

module.exports = app => {
  const sequelize = app.src.db.sequelize;
  const modelos = app.src.db.models;
  const presupuestoService = require('../../services/presupuestoService');

  const SQL_EN_REVISION = `d.estado IN ('NUEVO', 'ENVIADO', 'DERIVADO', 'RECHAZADO')`;
  const SQL_PEND_FIRMA = `d.estado IN ('CERRADO', 'APROBADO') AND COALESCE(d.firmado, false) = false AND COALESCE(d.aprobado_cd, false) = false AND (d.firmante_actual IS NOT NULL OR d.aprobador_cd_actual IS NOT NULL)`;
  const SQL_FIRMADO = `d.estado IN ('CERRADO', 'APROBADO') AND (COALESCE(d.firmado, false) = true OR COALESCE(d.aprobado_cd, false) = true)`;
  const SQL_CUSTODIA = `d.estado IN ('CERRADO', 'APROBADO') AND COALESCE(d.firmado, false) = false AND COALESCE(d.aprobado_cd, false) = false AND d.firmante_actual IS NULL AND d.aprobador_cd_actual IS NULL`;
  const SQL_CONCLUIDO = `d.estado IN ('CERRADO', 'APROBADO') AND (COALESCE(d.firmado, false) = true OR COALESCE(d.aprobado_cd, false) = true OR (d.firmante_actual IS NULL AND d.aprobador_cd_actual IS NULL))`;
  const SQL_NO_EXTERNO_INST = `COALESCE(d.origen_radicacion, '') != 'EXTERNO_INSTITUCIONAL' AND COALESCE(d.alcance_archivo, 'UNIDAD') != 'INSTITUCIONAL' AND LOWER(COALESCE(d.nombre, '')) NOT LIKE 'marabunta/%'`;

  /**
   * Consulta el método rector de firma/aprobación configurado en el sistema
   */
  async function obtenerMetodoFirma() {
    try {
      const [row] = await sequelize.query(
        `SELECT valor FROM configuracion_sistema WHERE clave = 'TIPO_FIRMA_VALIDACION' LIMIT 1;`,
        { type: sequelize.QueryTypes.SELECT }
      );
      if (row && row.valor === 'CIUDADANIA_DIGITAL') {
        return {
          metodo: 'CIUDADANIA_DIGITAL',
          label: 'Ciudadanía Digital (AGETIC)'
        };
      }
    } catch (e) {
      logger.warn('[METRICAS] No se pudo consultar TIPO_FIRMA_VALIDACION, usando defecto FIRMA_DIGITAL:', e.message);
    }
    return {
      metodo: 'FIRMA_DIGITAL',
      label: 'Firma Digital (Token / PKCS#11)'
    };
  }

  /**
   * Helper para extraer ID de usuario y rol autenticado
   */
  function obtenerUsuarioAutenticado(req) {
    if (req.user && req.user.id_usuario) return req.user;
    if (req.session && req.session.passport && req.session.passport.user) {
      return req.session.passport.user;
    }
    return null;
  }

  /**
   * GET /api/v1/monitoreo/metricas/global
   * Visión Global Estratégica (MAE / Admin):
   * - Carga, pendientes de revisión y pendientes de firma por unidad
   * - Distribución de estados del ciclo documental y firma
   * - Embudo/comparativa de modalidades de firma
   * - Producción por tipo de documento / plantilla
   * - Tendencia mensual (últimos 6 meses)
   * - Listado detallado de documentos cerrados pendientes de firma
   */
  app.get('/api/v1/monitoreo/metricas/global', async (req, res) => {
    try {
      const { metodo: metodoFirma, label: metodoFirmaLabel } = await obtenerMetodoFirma();
      const colFirmanteActivo = metodoFirma === 'CIUDADANIA_DIGITAL'
        ? 'COALESCE(d.aprobador_cd_actual, d.firmante_actual)'
        : 'COALESCE(d.firmante_actual, d.aprobador_cd_actual)';

      // 1. Carga de pendientes de revisión, pendientes de firma y concluidos por Unidad
      const qryUnidades = `
        SELECT 
          un.id_unidad,
          un.nombre AS unidad,
          un.abreviacion,
          COUNT(DISTINCT d.id_documento) FILTER (WHERE ${SQL_EN_REVISION}) AS pendientes,
          COUNT(DISTINCT d.id_documento) FILTER (WHERE ${SQL_PEND_FIRMA}) AS pendientes_firma,
          COUNT(DISTINCT d.id_documento) FILTER (WHERE ${SQL_FIRMADO}) AS firmados,
          COUNT(DISTINCT d.id_documento) FILTER (WHERE ${SQL_CONCLUIDO}) AS atendidos,
          COUNT(DISTINCT d.id_documento) FILTER (WHERE (${SQL_EN_REVISION} OR ${SQL_PEND_FIRMA}) AND (NOW() - d._fecha_modificacion) > INTERVAL '3 days') AS con_demora,
          COUNT(DISTINCT d.id_documento) AS total
        FROM unidad un
        LEFT JOIN usuario us ON (us.fid_unidad = un.id_unidad AND us.estado = 'ACTIVO')
        LEFT JOIN documento d ON (
          d.estado != 'ELIMINADO'
          AND (${SQL_NO_EXTERNO_INST})
          AND (
            d.via_actual = us.id_usuario
            OR d.firmante_actual = us.id_usuario
            OR d.aprobador_cd_actual = us.id_usuario
            OR (d.via_actual IS NULL AND d.firmante_actual IS NULL AND d.aprobador_cd_actual IS NULL AND d._usuario_creacion = us.id_usuario)
          )
        )
        WHERE un.estado = 'ACTIVO'
        GROUP BY un.id_unidad, un.nombre, un.abreviacion
        ORDER BY pendientes_firma DESC, pendientes DESC, un.nombre ASC;
      `;
      const unidades = await sequelize.query(qryUnidades, { type: sequelize.QueryTypes.SELECT });

      // 2. Distribución global exacta por estado + ciclo de firma
      const qryCiclo = `
        SELECT
          COUNT(*) FILTER (WHERE d.estado = 'NUEVO') AS nuevo,
          COUNT(*) FILTER (WHERE d.estado = 'ENVIADO') AS enviado,
          COUNT(*) FILTER (WHERE d.estado = 'DERIVADO') AS derivado,
          COUNT(*) FILTER (WHERE d.estado = 'RECHAZADO') AS rechazado,
          COUNT(*) FILTER (WHERE ${SQL_PEND_FIRMA}) AS pendiente_firma,
          COUNT(*) FILTER (WHERE ${SQL_FIRMADO}) AS firmado,
          COUNT(*) FILTER (WHERE ${SQL_CUSTODIA}) AS custodia_institucional,
          COUNT(*) FILTER (WHERE d.estado IN ('CERRADO', 'APROBADO')) AS emitidos_cite,
          COUNT(*) FILTER (WHERE d.estado IN ('CERRADO', 'APROBADO') AND COALESCE(d.firmado, false) = true) AS firmados_token,
          COUNT(*) FILTER (WHERE d.estado IN ('CERRADO', 'APROBADO') AND COALESCE(d.aprobado_cd, false) = true) AS aprobados_cd,
          COUNT(*) AS total_global
        FROM documento d
        WHERE d.estado != 'ELIMINADO'
          AND (${SQL_NO_EXTERNO_INST});
      `;
      const [ciclo] = await sequelize.query(qryCiclo, { type: sequelize.QueryTypes.SELECT });

      const distribucionEstados = {
        NUEVO: parseInt(ciclo?.nuevo || 0, 10),
        ENVIADO: parseInt(ciclo?.enviado || 0, 10),
        DERIVADO: parseInt(ciclo?.derivado || 0, 10),
        RECHAZADO: parseInt(ciclo?.rechazado || 0, 10),
        PENDIENTE_FIRMA: parseInt(ciclo?.pendiente_firma || 0, 10),
        FIRMADO: parseInt(ciclo?.firmado || 0, 10),
        CUSTODIA_INSTITUCIONAL: parseInt(ciclo?.custodia_institucional || 0, 10)
      };

      const totalGlobal = parseInt(ciclo?.total_global || 0, 10);
      const totalPendientes = distribucionEstados.NUEVO + distribucionEstados.ENVIADO + distribucionEstados.DERIVADO + distribucionEstados.RECHAZADO;
      const totalPendientesFirma = distribucionEstados.PENDIENTE_FIRMA;
      const totalFirmados = distribucionEstados.FIRMADO;
      const totalCustodia = distribucionEstados.CUSTODIA_INSTITUCIONAL;
      const totalConcluidos = totalFirmados + totalCustodia;
      const tasaResolucion = totalGlobal > 0 ? Math.round((totalConcluidos / totalGlobal) * 100) : 0;

      // 3. Producción por Tipo de Documento / Plantilla (Gráfica G3)
      const qryTipos = `
        SELECT
          COALESCE(NULLIF(TRIM(d.nombre_plantilla), ''), 'Documento General') AS tipo,
          COUNT(*) FILTER (WHERE ${SQL_EN_REVISION}) AS en_curso,
          COUNT(*) FILTER (WHERE ${SQL_PEND_FIRMA}) AS pendientes_firma,
          COUNT(*) FILTER (WHERE ${SQL_CONCLUIDO}) AS firmados_concluidos,
          COUNT(*) AS total
        FROM documento d
        WHERE d.estado != 'ELIMINADO'
          AND (${SQL_NO_EXTERNO_INST})
        GROUP BY COALESCE(NULLIF(TRIM(d.nombre_plantilla), ''), 'Documento General')
        ORDER BY total DESC, tipo ASC
        LIMIT 10;
      `;
      const tiposRaw = await sequelize.query(qryTipos, { type: sequelize.QueryTypes.SELECT });

      // 4. Tendencia temporal de los últimos 6 meses (Gráfica G4)
      const qryTendencia = `
        SELECT 
          TO_CHAR(d._fecha_creacion, 'YYYY-MM') AS mes,
          COUNT(*) AS creados,
          COUNT(*) FILTER (WHERE ${SQL_EN_REVISION}) AS en_revision,
          COUNT(*) FILTER (WHERE ${SQL_PEND_FIRMA}) AS pendientes_firma,
          COUNT(*) FILTER (WHERE ${SQL_CONCLUIDO}) AS concluidos
        FROM documento d
        WHERE d._fecha_creacion >= (NOW() - INTERVAL '6 months')
          AND d.estado != 'ELIMINADO'
          AND (${SQL_NO_EXTERNO_INST})
        GROUP BY TO_CHAR(d._fecha_creacion, 'YYYY-MM')
        ORDER BY mes ASC;
      `;
      const tendencia = await sequelize.query(qryTendencia, { type: sequelize.QueryTypes.SELECT });

      // 5. Listado detallado de documentos cerrados/aprobados pendientes de firma
      const qryDocsPendFirma = `
        SELECT
          d.id_documento,
          d.nombre AS cite,
          COALESCE(NULLIF(TRIM(d.nombre_plantilla), ''), 'Documento') AS tipo,
          COALESCE(NULLIF(TRIM(d.referencia), ''), 'Sin referencia') AS asunto,
          COALESCE(d.clasificacion::text, 'PUBLICO') AS clasificacion,
          ${colFirmanteActivo} AS firmante_id,
          TRIM(CONCAT(COALESCE(uf.nombres, ''), ' ', COALESCE(uf.apellidos, ''))) AS firmante_nombre,
          COALESCE(uf.cargo, 'Autoridad / Usuario') AS firmante_cargo,
          d._fecha_modificacion AS fecha_cierre,
          FLOOR(EXTRACT(EPOCH FROM (NOW() - d._fecha_modificacion)) / 86400) AS dias_espera
        FROM documento d
        LEFT JOIN usuario uf ON uf.id_usuario = ${colFirmanteActivo}
        WHERE d.estado != 'ELIMINADO' AND (${SQL_PEND_FIRMA})
        ORDER BY d._fecha_modificacion ASC;
      `;
      const docsPendFirma = await sequelize.query(qryDocsPendFirma, { type: sequelize.QueryTypes.SELECT });

      res.status(200).send(util.formatearMensaje('EXITO', 'Métricas globales obtenidas.', {
        metodoFirma,
        metodoFirmaLabel,
        resumen: {
          totalGlobal,
          totalPendientes,
          totalPendientesFirma,
          totalFirmados,
          totalCustodia,
          totalConcluidos,
          tasaResolucion
        },
        distribucionEstados,
        embudoFirmas: {
          emitidosConCite: parseInt(ciclo?.emitidos_cite || 0, 10),
          pendientesFirma: totalPendientesFirma,
          firmadosToken: parseInt(ciclo?.firmados_token || 0, 10),
          aprobadosCd: parseInt(ciclo?.aprobados_cd || 0, 10),
          custodiaInstitucional: totalCustodia
        },
        porTipoPlantilla: tiposRaw.map(t => ({
          tipo: t.tipo,
          en_curso: parseInt(t.en_curso || 0, 10),
          pendientes_firma: parseInt(t.pendientes_firma || 0, 10),
          firmados_concluidos: parseInt(t.firmados_concluidos || 0, 10),
          total: parseInt(t.total || 0, 10)
        })),
        porUnidad: unidades.map(u => ({
          id_unidad: u.id_unidad,
          unidad: u.unidad,
          abreviacion: u.abreviacion || u.unidad.substring(0, 4).toUpperCase(),
          pendientes: parseInt(u.pendientes || 0, 10),
          pendientes_firma: parseInt(u.pendientes_firma || 0, 10),
          firmados: parseInt(u.firmados || 0, 10),
          atendidos: parseInt(u.atendidos || 0, 10),
          con_demora: parseInt(u.con_demora || 0, 10),
          total: parseInt(u.total || 0, 10)
        })),
        tendenciaMensual: tendencia.map(t => ({
          mes: t.mes,
          mesLabel: moment(t.mes, 'YYYY-MM').locale('es').format('MMM YYYY'),
          creados: parseInt(t.creados || 0, 10),
          en_revision: parseInt(t.en_revision || 0, 10),
          pendientes_firma: parseInt(t.pendientes_firma || 0, 10),
          concluidos: parseInt(t.concluidos || 0, 10)
        })),
        documentosPendientesFirma: docsPendFirma.map(p => ({
          id_documento: p.id_documento,
          cite: p.cite,
          tipo: p.tipo,
          asunto: p.asunto,
          clasificacion: p.clasificacion,
          firmante_id: p.firmante_id,
          firmante_nombre: p.firmante_nombre || 'Sin asignar',
          firmante_cargo: p.firmante_cargo,
          metodo_requerido: metodoFirma,
          fecha_cierre: p.fecha_cierre,
          dias_espera: Math.max(0, parseInt(p.dias_espera || 0, 10))
        }))
      }));
    } catch (err) {
      logger.error('[METRICAS GLOBAL] Error:', err);
      res.status(500).send(util.formatearMensaje('ERROR', err.message || err));
    }
  });

  /**
   * GET /api/v1/monitoreo/metricas/unidad/:id_unidad
   * Visión Táctica de Unidad (Jefatura de Área):
   * - Balance de carga por funcionario (revisión + pendientes de firma + concluidos)
   * - Semáforo de antigüedad de expedientes en bandeja:
   *   Verde (< 24h), Amarillo (1 a 3 días), Rojo (> 3 días)
   */
  app.get('/api/v1/monitoreo/metricas/unidad/:id_unidad', async (req, res) => {
    try {
      const idUnidad = parseInt(req.params.id_unidad, 10);
      if (isNaN(idUnidad)) {
        return res.status(400).send(util.formatearMensaje('ERROR', 'Identificador de unidad inválido.'));
      }

      // Desglose por funcionario de la unidad
      const qryFuncionarios = `
        SELECT 
          u.id_usuario,
          u.nombres,
          u.apellidos,
          u.cargo,
          COUNT(DISTINCT d.id_documento) FILTER (WHERE ${SQL_EN_REVISION}) AS pendientes,
          COUNT(DISTINCT d.id_documento) FILTER (WHERE ${SQL_PEND_FIRMA} AND (d.firmante_actual = u.id_usuario OR d.aprobador_cd_actual = u.id_usuario)) AS pendientes_firma,
          COUNT(DISTINCT d.id_documento) FILTER (WHERE (${SQL_EN_REVISION} OR ${SQL_PEND_FIRMA}) AND (NOW() - d._fecha_modificacion) < INTERVAL '24 hours') AS verde,
          COUNT(DISTINCT d.id_documento) FILTER (WHERE (${SQL_EN_REVISION} OR ${SQL_PEND_FIRMA}) AND (NOW() - d._fecha_modificacion) BETWEEN INTERVAL '24 hours' AND INTERVAL '3 days') AS amarillo,
          COUNT(DISTINCT d.id_documento) FILTER (WHERE (${SQL_EN_REVISION} OR ${SQL_PEND_FIRMA}) AND (NOW() - d._fecha_modificacion) > INTERVAL '3 days') AS rojo,
          COUNT(DISTINCT d.id_documento) FILTER (WHERE ${SQL_FIRMADO}) AS firmados,
          COUNT(DISTINCT d.id_documento) FILTER (WHERE ${SQL_CONCLUIDO}) AS atendidos
        FROM usuario u
        LEFT JOIN documento d ON (
          d.estado != 'ELIMINADO'
          AND (${SQL_NO_EXTERNO_INST})
          AND (
            d.via_actual = u.id_usuario
            OR d.firmante_actual = u.id_usuario
            OR d.aprobador_cd_actual = u.id_usuario
            OR (d.via_actual IS NULL AND d.firmante_actual IS NULL AND d.aprobador_cd_actual IS NULL AND d._usuario_creacion = u.id_usuario)
          )
        )
        WHERE u.fid_unidad = :idUnidad AND u.estado = 'ACTIVO'
        GROUP BY u.id_usuario, u.nombres, u.apellidos, u.cargo
        ORDER BY pendientes_firma DESC, pendientes DESC, u.apellidos ASC;
      `;

      const funcionarios = await sequelize.query(qryFuncionarios, {
        replacements: { idUnidad },
        type: sequelize.QueryTypes.SELECT
      });

      res.status(200).send(util.formatearMensaje('EXITO', 'Métricas de unidad obtenidas.', {
        id_unidad: idUnidad,
        funcionarios: funcionarios.map(f => ({
          id_usuario: f.id_usuario,
          nombreCompleto: `${f.nombres || ''} ${f.apellidos || ''}`.trim(),
          cargo: f.cargo || 'Usuario',
          pendientes: parseInt(f.pendientes || 0, 10),
          pendientes_firma: parseInt(f.pendientes_firma || 0, 10),
          firmados: parseInt(f.firmados || 0, 10),
          atendidos: parseInt(f.atendidos || 0, 10),
          semaforo: {
            verde: parseInt(f.verde || 0, 10),
            amarillo: parseInt(f.amarillo || 0, 10),
            rojo: parseInt(f.rojo || 0, 10)
          }
        }))
      }));
    } catch (err) {
      logger.error('[METRICAS UNIDAD] Error:', err);
      res.status(500).send(util.formatearMensaje('ERROR', err.message || err));
    }
  });

  /**
   * GET /api/v1/monitoreo/metricas/mi-actividad
   * Visión de Auto-Monitoreo y Productividad del Funcionario:
   * Accesible para cualquier usuario autenticado sin requerir rol de jefe.
   */
  app.get('/api/v1/monitoreo/metricas/mi-actividad', async (req, res) => {
    try {
      const user = obtenerUsuarioAutenticado(req);
      const idUsuario = user ? user.id_usuario : (req.query.id_usuario ? parseInt(req.query.id_usuario, 10) : 1);
      const { metodo: metodoFirma, label: metodoFirmaLabel } = await obtenerMetodoFirma();

      // 1. Mis pendientes en bandeja (incluyendo los cerrados pendientes de firma asignados al usuario)
      const qryPendientes = `
        SELECT 
          d.id_documento,
          d.nombre AS cite,
          COALESCE(NULLIF(TRIM(d.referencia), ''), d.nombre_plantilla, 'Sin asunto') AS asunto,
          d.estado,
          CASE
            WHEN ${SQL_PEND_FIRMA} AND (d.firmante_actual = :idUsuario OR d.aprobador_cd_actual = :idUsuario)
            THEN 'PENDIENTE_FIRMA'
            ELSE d.estado::text
          END AS estado_monitoreo,
          d._fecha_modificacion,
          FLOOR(EXTRACT(DAY FROM (NOW() - d._fecha_modificacion))) AS dias_en_bandeja
        FROM documento d
        WHERE d.estado != 'ELIMINADO'
          AND (
            ((d.via_actual = :idUsuario OR (d.via_actual IS NULL AND d._usuario_creacion = :idUsuario)) AND d.estado IN ('NUEVO', 'ENVIADO', 'DERIVADO', 'RECHAZADO'))
            OR (${SQL_PEND_FIRMA} AND (d.firmante_actual = :idUsuario OR d.aprobador_cd_actual = :idUsuario))
          )
        ORDER BY d._fecha_modificacion ASC
        LIMIT 15;
      `;
      const pendientes = await sequelize.query(qryPendientes, {
        replacements: { idUsuario },
        type: sequelize.QueryTypes.SELECT
      });

      // 2. Historial de acciones en los últimos 7 días
      const qrySemana = `
        SELECT 
          TO_CHAR(h._fecha_creacion, 'YYYY-MM-DD') AS dia,
          COUNT(*) AS total_acciones
        FROM historial_flujo h
        WHERE h._usuario_creacion = :idUsuario 
          AND h._fecha_creacion >= (NOW() - INTERVAL '7 days')
        GROUP BY TO_CHAR(h._fecha_creacion, 'YYYY-MM-DD')
        ORDER BY dia ASC;
      `;
      const semana = await sequelize.query(qrySemana, {
        replacements: { idUsuario },
        type: sequelize.QueryTypes.SELECT
      });

      // 3. Resumen de rendimiento del mes en curso (incluyendo firmas)
      const qryRendimientoMes = `
        SELECT 
          COUNT(*) FILTER (WHERE h.accion = 'CREADO') AS creados,
          COUNT(*) FILTER (WHERE h.accion = 'DERIVADO') AS derivados,
          COUNT(*) FILTER (WHERE h.accion = 'APROBADO') AS aprobados,
          COUNT(*) FILTER (WHERE h.accion = 'CERRADO') AS cerrados,
          COUNT(*) FILTER (WHERE h.accion IN ('FIRMO', 'APROBADO_CD')) AS firmados
        FROM historial_flujo h
        WHERE h._usuario_creacion = :idUsuario
          AND h._fecha_creacion >= DATE_TRUNC('month', NOW());
      `;
      const [rendimiento] = await sequelize.query(qryRendimientoMes, {
        replacements: { idUsuario },
        type: sequelize.QueryTypes.SELECT
      });

      const totalPendientesFirmaUser = pendientes.filter(p => p.estado_monitoreo === 'PENDIENTE_FIRMA').length;
      const totalFirmadosUser = parseInt(rendimiento?.firmados || 0, 10);
      const totalAtendidos = (parseInt(rendimiento?.derivados || 0, 10)) + (parseInt(rendimiento?.aprobados || 0, 10)) + (parseInt(rendimiento?.cerrados || 0, 10)) + totalFirmadosUser;
      const totalCreados = parseInt(rendimiento?.creados || 0, 10);
      const totalPendientesCount = pendientes.length;

      res.status(200).send(util.formatearMensaje('EXITO', 'Métricas personales obtenidas.', {
        id_usuario: idUsuario,
        metodoFirma,
        metodoFirmaLabel,
        resumenMes: {
          creados: totalCreados,
          atendidos: totalAtendidos,
          pendientes: totalPendientesCount,
          pendientesFirma: totalPendientesFirmaUser,
          firmados: totalFirmadosUser,
          tasaEficiencia: (totalAtendidos + totalPendientesCount) > 0
            ? Math.round((totalAtendidos / (totalAtendidos + totalPendientesCount)) * 100)
            : 100
        },
        actividadUltimos7Dias: semana.map(s => ({
          dia: s.dia,
          diaLabel: moment(s.dia).locale('es').format('ddd DD'),
          acciones: parseInt(s.total_acciones, 10)
        })),
        misPendientesCriticos: pendientes.map(p => ({
          id_documento: p.id_documento,
          cite: p.cite || 'S/N',
          asunto: p.asunto || 'Sin asunto',
          estado: p.estado,
          estado_monitoreo: p.estado_monitoreo,
          dias_espera: Math.max(0, Math.floor(p.dias_en_bandeja || 0))
        }))
      }));
    } catch (err) {
      logger.error('[METRICAS MI-ACTIVIDAD] Error:', err);
      res.status(500).send(util.formatearMensaje('ERROR', err.message || err));
    }
  });

  /**
   * GET /api/v1/admin/metrics/overview
   * Resumen Ejecutivo Integral para el Home Dashboard:
   * - Documentos activos
   * - Presupuesto (Vigente, Comprometido, Saldo exacto)
   * - Ventanilla Única
   * - Gráfico de Donut y Flujo Temporal
   */
  app.get('/api/v1/admin/metrics/overview', async (req, res) => {
    try {
      const anioActual = `${moment().tz('America/La_Paz').year()}`;
      const auditUser = req.body?.audit_usuario || req.user || {};
      const idUsuario = Number(auditUser.id_usuario || auditUser.id || 0);
      if (!idUsuario) {
        return res.status(401).send(util.formatearMensaje('ERROR', 'Usuario no autenticado'));
      }

      // Obtener unidad del usuario autenticado para filtrar las métricas exclusivamente por su unidad / bandeja
      const [usrRow] = await sequelize.query(
        `SELECT id_usuario, fid_unidad FROM usuario WHERE id_usuario = :idUsuario LIMIT 1`,
        { replacements: { idUsuario }, type: sequelize.QueryTypes.SELECT }
      );
      const fidUnidad = usrRow?.fid_unidad || null;

      let unitUserIds = [idUsuario];
      if (fidUnidad) {
        const unitRows = await sequelize.query(
          `SELECT id_usuario FROM usuario WHERE fid_unidad = :fidUnidad AND estado = 'ACTIVO'`,
          { replacements: { fidUnidad }, type: sequelize.QueryTypes.SELECT }
        );
        if (unitRows.length > 0) {
          unitUserIds = unitRows.map(r => Number(r.id_usuario)).filter(n => n > 0);
        }
      }

      const idsSql = unitUserIds.join(',');
      const jsonLikesSql = unitUserIds.map(uid => `
        de LIKE '[${uid}]' OR de LIKE '[${uid},%' OR de LIKE '%,${uid},%' OR de LIKE '%,${uid}]' OR
        para LIKE '[${uid}]' OR para LIKE '[${uid},%' OR para LIKE '%,${uid},%' OR para LIKE '%,${uid}]' OR
        via LIKE '[${uid}]' OR via LIKE '[${uid},%' OR via LIKE '%,${uid},%' OR via LIKE '%,${uid}]'
      `).join(' OR ');

      const scopeWhere = `
        estado != 'ELIMINADO' AND (
          _usuario_creacion = ${idUsuario}
          OR (
            estado != 'NUEVO' AND (
              _usuario_creacion IN (${idsSql})
              OR via_actual IN (${idsSql})
              OR (${jsonLikesSql})
            )
          )
        )
      `;

      // 1. Conteo de documentos por estado de la unidad / usuario
      const qryDocs = `
        SELECT 
          COUNT(*) FILTER (WHERE estado IN ('NUEVO', 'ENVIADO', 'DERIVADO')) AS en_curso,
          COUNT(*) FILTER (WHERE estado = 'APROBADO') AS aprobados,
          COUNT(*) FILTER (WHERE estado = 'CERRADO') AS cerrados,
          COUNT(*) FILTER (WHERE origen_radicacion = 'VIRTUAL') AS ventanilla_virtual,
          COUNT(*) FILTER (WHERE origen_radicacion = 'FISICO') AS ventanilla_fisica,
          COUNT(*) AS total_general
        FROM documento
        WHERE ${scopeWhere};
      `;
      const [docsStats] = await sequelize.query(qryDocs, { type: sequelize.QueryTypes.SELECT });

      // 2. Saldos de Presupuesto Exactos
      let saldosResumen = {
        totalVigente: '0.00',
        totalComprometido: '0.00',
        totalPagado: '0.00',
        totalSaldo: '0.00',
        porcentajeEjecutado: 0
      };

      try {
        const saldosPartidas = await presupuestoService.obtenerSaldosGestion(sequelize, anioActual);
        let vigCentavos = 0, compCentavos = 0, pagCentavos = 0, saldoCentavos = 0;
        saldosPartidas.forEach(p => {
          vigCentavos += presupuestoService.aCentavos(p.vigente);
          compCentavos += presupuestoService.aCentavos(p.comprometido);
          pagCentavos += presupuestoService.aCentavos(p.pagado);
          saldoCentavos += presupuestoService.aCentavos(p.saldo);
        });

        saldosResumen = {
          totalVigente: presupuestoService.aDecimal(vigCentavos),
          totalComprometido: presupuestoService.aDecimal(compCentavos),
          totalPagado: presupuestoService.aDecimal(pagCentavos),
          totalSaldo: presupuestoService.aDecimal(saldoCentavos),
          totalVigenteFormateado: presupuestoService.formatearBolivianos(vigCentavos),
          totalSaldoFormateado: presupuestoService.formatearBolivianos(saldoCentavos),
          porcentajeEjecutado: vigCentavos > 0 ? Math.round((compCentavos / vigCentavos) * 100) : 0
        };
      } catch (presErr) {
        logger.warn('[METRICAS OVERVIEW] No se pudieron calcular saldos:', presErr.message);
      }

      // 3. Historial de los últimos 6 meses para gráfica de la unidad / usuario
      const qryMeses = `
        SELECT 
          TO_CHAR(_fecha_creacion, 'YYYY-MM') AS mes,
          COUNT(*) AS cantidad
        FROM documento
        WHERE _fecha_creacion >= (NOW() - INTERVAL '6 months') AND ${scopeWhere}
        GROUP BY TO_CHAR(_fecha_creacion, 'YYYY-MM')
        ORDER BY mes ASC;
      `;
      const meses = await sequelize.query(qryMeses, { type: sequelize.QueryTypes.SELECT });

      res.status(200).send(util.formatearMensaje('EXITO', 'Overview institucional obtenido.', {
        gestion: anioActual,
        documentos: {
          en_curso: parseInt(docsStats?.en_curso || 0, 10),
          aprobados: parseInt(docsStats?.aprobados || 0, 10),
          cerrados: parseInt(docsStats?.cerrados || 0, 10),
          ventanilla_virtual: parseInt(docsStats?.ventanilla_virtual || 0, 10),
          ventanilla_fisica: parseInt(docsStats?.ventanilla_fisica || 0, 10),
          total_general: parseInt(docsStats?.total_general || 0, 10)
        },
        presupuesto: saldosResumen,
        serieMensual: meses.map(m => ({
          mes: m.mes,
          mesLabel: moment(m.mes, 'YYYY-MM').locale('es').format('MMM'),
          cantidad: parseInt(m.cantidad || 0, 10)
        }))
      }));
    } catch (err) {
      logger.error('[METRICAS OVERVIEW] Error:', err);
      res.status(500).send(util.formatearMensaje('ERROR', err.message || err));
    }
  });
};
