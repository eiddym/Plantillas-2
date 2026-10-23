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
   * - Carga y pendientes por unidad
   * - Distribución de estados
   * - Tendencia mensual (últimos 6 meses)
   * - Documentos con demora crítica (> 3 días)
   */
  app.get('/api/v1/monitoreo/metricas/global', async (req, res) => {
    try {
      // 1. Carga de pendientes y despachados por Unidad
      const qryUnidades = `
        SELECT 
          un.id_unidad,
          un.nombre AS unidad,
          un.abreviacion,
          COUNT(d.id_documento) FILTER (WHERE d.estado IN ('NUEVO', 'ENVIADO', 'DERIVADO')) AS pendientes,
          COUNT(d.id_documento) FILTER (WHERE d.estado IN ('APROBADO', 'CERRADO')) AS atendidos,
          COUNT(d.id_documento) FILTER (WHERE d.estado IN ('NUEVO', 'ENVIADO', 'DERIVADO') AND (NOW() - d._fecha_modificacion) > INTERVAL '3 days') AS con_demora,
          COUNT(d.id_documento) AS total
        FROM unidad un
        LEFT JOIN usuario us ON (us.fid_unidad = un.id_unidad AND us.estado = 'ACTIVO')
        LEFT JOIN documento d ON (
          (d.via_actual = us.id_usuario OR (d.via_actual IS NULL AND d._usuario_creacion = us.id_usuario))
          AND d.estado != 'ELIMINADO'
        )
        WHERE un.estado = 'ACTIVO'
        GROUP BY un.id_unidad, un.nombre, un.abreviacion
        ORDER BY pendientes DESC, un.nombre ASC;
      `;
      const unidades = await sequelize.query(qryUnidades, { type: sequelize.QueryTypes.SELECT });

      // 2. Distribución global por Estado
      const qryEstados = `
        SELECT 
          estado,
          COUNT(*) AS cantidad
        FROM documento
        WHERE estado != 'ELIMINADO'
        GROUP BY estado;
      `;
      const estadosRaw = await sequelize.query(qryEstados, { type: sequelize.QueryTypes.SELECT });
      const distribucionEstados = {
        NUEVO: 0,
        ENVIADO: 0,
        DERIVADO: 0,
        APROBADO: 0,
        CERRADO: 0,
        RECHAZADO: 0
      };
      estadosRaw.forEach(e => {
        distribucionEstados[e.estado] = parseInt(e.cantidad, 10);
      });

      // 3. Tendencia temporal de los últimos 6 meses (para Gráfico de Área ECharts)
      const qryTendencia = `
        SELECT 
          TO_CHAR(d._fecha_creacion, 'YYYY-MM') AS mes,
          COUNT(*) AS creados,
          COUNT(*) FILTER (WHERE d.estado IN ('APROBADO', 'CERRADO')) AS concluidos,
          COUNT(*) FILTER (WHERE d.estado IN ('NUEVO', 'ENVIADO', 'DERIVADO')) AS pendientes
        FROM documento d
        WHERE d._fecha_creacion >= (NOW() - INTERVAL '6 months') AND d.estado != 'ELIMINADO'
        GROUP BY TO_CHAR(d._fecha_creacion, 'YYYY-MM')
        ORDER BY mes ASC;
      `;
      const tendencia = await sequelize.query(qryTendencia, { type: sequelize.QueryTypes.SELECT });

      // 4. Totales Consolidados
      const totalGlobal = Object.values(distribucionEstados).reduce((a, b) => a + b, 0);
      const totalPendientes = (distribucionEstados.NUEVO || 0) + (distribucionEstados.ENVIADO || 0) + (distribucionEstados.DERIVADO || 0);
      const totalConcluidos = (distribucionEstados.APROBADO || 0) + (distribucionEstados.CERRADO || 0);
      const tasaResolucion = totalGlobal > 0 ? Math.round((totalConcluidos / totalGlobal) * 100) : 0;

      res.status(200).send(util.formatearMensaje('EXITO', 'Métricas globales obtenidas.', {
        resumen: {
          totalGlobal,
          totalPendientes,
          totalConcluidos,
          tasaResolucion
        },
        distribucionEstados,
        porUnidad: unidades.map(u => ({
          id_unidad: u.id_unidad,
          unidad: u.unidad,
          abreviacion: u.abreviacion || u.unidad.substring(0, 4).toUpperCase(),
          pendientes: parseInt(u.pendientes || 0, 10),
          atendidos: parseInt(u.atendidos || 0, 10),
          con_demora: parseInt(u.con_demora || 0, 10),
          total: parseInt(u.total || 0, 10)
        })),
        tendenciaMensual: tendencia.map(t => ({
          mes: t.mes,
          mesLabel: moment(t.mes, 'YYYY-MM').locale('es').format('MMM YYYY'),
          creados: parseInt(t.creados || 0, 10),
          concluidos: parseInt(t.concluidos || 0, 10),
          pendientes: parseInt(t.pendientes || 0, 10)
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
   * - Balance de carga por funcionario (quién tiene cuántos pendientes)
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
          COUNT(d.id_documento) FILTER (WHERE d.estado IN ('NUEVO', 'ENVIADO', 'DERIVADO')) AS pendientes,
          COUNT(d.id_documento) FILTER (WHERE d.estado IN ('NUEVO', 'ENVIADO', 'DERIVADO') AND (NOW() - d._fecha_modificacion) < INTERVAL '24 hours') AS verde,
          COUNT(d.id_documento) FILTER (WHERE d.estado IN ('NUEVO', 'ENVIADO', 'DERIVADO') AND (NOW() - d._fecha_modificacion) BETWEEN INTERVAL '24 hours' AND INTERVAL '3 days') AS amarillo,
          COUNT(d.id_documento) FILTER (WHERE d.estado IN ('NUEVO', 'ENVIADO', 'DERIVADO') AND (NOW() - d._fecha_modificacion) > INTERVAL '3 days') AS rojo,
          COUNT(d.id_documento) FILTER (WHERE d.estado IN ('APROBADO', 'CERRADO')) AS atendidos
        FROM usuario u
        LEFT JOIN documento d ON (
          (d.via_actual = u.id_usuario OR (d.via_actual IS NULL AND d._usuario_creacion = u.id_usuario))
          AND d.estado != 'ELIMINADO'
        )
        WHERE u.fid_unidad = :idUnidad AND u.estado = 'ACTIVO'
        GROUP BY u.id_usuario, u.nombres, u.apellidos, u.cargo
        ORDER BY pendientes DESC, u.apellidos ASC;
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
          cargo: f.cargo || 'Funcionario',
          pendientes: parseInt(f.pendientes || 0, 10),
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

      // 1. Mis pendientes en bandeja
      const qryPendientes = `
        SELECT 
          d.id_documento,
          d.nombre AS cite,
          COALESCE(d.referencia, '') AS asunto,
          d.estado,
          d._fecha_modificacion,
          EXTRACT(DAY FROM (NOW() - d._fecha_modificacion)) AS dias_en_bandeja
        FROM documento d
        WHERE (d.via_actual = :idUsuario OR (d.via_actual IS NULL AND d._usuario_creacion = :idUsuario))
          AND d.estado IN ('NUEVO', 'ENVIADO', 'DERIVADO')
        ORDER BY d._fecha_modificacion ASC
        LIMIT 10;
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

      // 3. Resumen de rendimiento del mes en curso
      const qryRendimientoMes = `
        SELECT 
          COUNT(*) FILTER (WHERE h.accion = 'CREADO') AS creados,
          COUNT(*) FILTER (WHERE h.accion = 'DERIVADO') AS derivados,
          COUNT(*) FILTER (WHERE h.accion = 'APROBADO') AS aprobados,
          COUNT(*) FILTER (WHERE h.accion = 'CERRADO') AS cerrados
        FROM historial_flujo h
        WHERE h._usuario_creacion = :idUsuario
          AND h._fecha_creacion >= DATE_TRUNC('month', NOW());
      `;
      const [rendimiento] = await sequelize.query(qryRendimientoMes, {
        replacements: { idUsuario },
        type: sequelize.QueryTypes.SELECT
      });

      const totalAtendidos = (parseInt(rendimiento?.derivados || 0, 10)) + (parseInt(rendimiento?.aprobados || 0, 10)) + (parseInt(rendimiento?.cerrados || 0, 10));
      const totalCreados = parseInt(rendimiento?.creados || 0, 10);
      const totalPendientesCount = pendientes.length;

      res.status(200).send(util.formatearMensaje('EXITO', 'Métricas personales obtenidas.', {
        id_usuario: idUsuario,
        resumenMes: {
          creados: totalCreados,
          atendidos: totalAtendidos,
          pendientes: totalPendientesCount,
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
          dias_espera: Math.floor(p.dias_en_bandeja || 0)
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

      // 1. Conteo de documentos por estado
      const qryDocs = `
        SELECT 
          COUNT(*) FILTER (WHERE estado IN ('NUEVO', 'ENVIADO', 'DERIVADO')) AS en_curso,
          COUNT(*) FILTER (WHERE estado = 'APROBADO') AS aprobados,
          COUNT(*) FILTER (WHERE estado = 'CERRADO') AS cerrados,
          COUNT(*) FILTER (WHERE origen_radicacion = 'VIRTUAL') AS ventanilla_virtual,
          COUNT(*) FILTER (WHERE origen_radicacion = 'FISICO') AS ventanilla_fisica,
          COUNT(*) AS total_general
        FROM documento
        WHERE estado != 'ELIMINADO';
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

      // 3. Historial de los últimos 6 meses para gráfica
      const qryMeses = `
        SELECT 
          TO_CHAR(_fecha_creacion, 'YYYY-MM') AS mes,
          COUNT(*) AS cantidad
        FROM documento
        WHERE _fecha_creacion >= (NOW() - INTERVAL '6 months') AND estado != 'ELIMINADO'
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
