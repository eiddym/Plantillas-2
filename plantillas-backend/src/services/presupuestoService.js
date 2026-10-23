'use strict';

/**
 * Servicio Especializado de Cálculo Presupuestario y Financiero
 * 
 * Implementa Aritmética de Centavos Enteros (Fixed-Point Integer Arithmetic)
 * para evitar imprecisiones de punto flotante binario (IEEE 754) en balances,
 * compromisos, devengados y reportes contables oficiales.
 */

const moment = require('moment');
const logger = require('../lib/logger');

/**
 * Convierte cualquier valor monetario (string, number, Decimal) a centavos enteros.
 * Ejemplo: "1500.50" -> 150050, 1500.5 -> 150050, "0.1" -> 10
 */
function aCentavos(valor) {
  if (valor === undefined || valor === null || valor === '') return 0;
  if (typeof valor === 'number') {
    return Math.round(valor * 100);
  }
  const limpio = String(valor).replace(/[^0-9.-]/g, '');
  const num = parseFloat(limpio);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Convierte centavos enteros a string decimal exacto con 2 decimales.
 * Ejemplo: 150050 -> "1500.50"
 */
function aDecimal(centavos) {
  const c = Math.round(centavos || 0);
  return (c / 100).toFixed(2);
}

/**
 * Formatea un monto en centavos o decimal a formato legible en moneda nacional.
 * Ejemplo: 150050 -> "1.500,50"
 */
function formatearBolivianos(monto) {
  const dec = typeof monto === 'number' && Number.isInteger(monto)
    ? (monto / 100).toFixed(2)
    : Number(monto || 0).toFixed(2);
  const partes = dec.split('.');
  const entero = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const centavos = partes[1] || '00';
  return `${entero},${centavos}`;
}

/**
 * Obtiene la ejecución presupuestaria y saldos reales de una gestión mediante
 * agregación atómica en PostgreSQL sin productos cartesianos ni promedios distorsionados.
 */
async function obtenerSaldosGestion(sequelize, gestion) {
  const anio = String(gestion || moment().tz('America/La_Paz').year());

  const qry = `
    SELECT 
      p.numero,
      p.descripcion,
      COALESCE(SUM(CASE WHEN p.tipo = 'INICIAL' THEN p.monto ELSE 0 END), 0)::numeric(15,2) AS inicial,
      COALESCE(SUM(CASE WHEN p.tipo = 'MODIFICADO' THEN p.monto ELSE 0 END), 0)::numeric(15,2) AS modificado,
      (COALESCE(SUM(CASE WHEN p.tipo = 'INICIAL' THEN p.monto ELSE 0 END), 0) + 
       COALESCE(SUM(CASE WHEN p.tipo = 'MODIFICADO' THEN p.monto ELSE 0 END), 0))::numeric(15,2) AS vigente,
      COALESCE(SUM(CASE WHEN p.tipo = 'COMPROMETIDO' AND p.fid_partida IS NULL THEN p.monto ELSE 0 END), 0)::numeric(15,2) AS comprometido,
      COALESCE(SUM(CASE WHEN p.tipo = 'PAGADO' AND p.monto > 0 THEN p.monto ELSE 0 END), 0)::numeric(15,2) AS pagado,
      ((COALESCE(SUM(CASE WHEN p.tipo = 'INICIAL' THEN p.monto ELSE 0 END), 0) + 
        COALESCE(SUM(CASE WHEN p.tipo = 'MODIFICADO' THEN p.monto ELSE 0 END), 0)) -
       COALESCE(SUM(CASE WHEN p.tipo = 'COMPROMETIDO' AND p.fid_partida IS NULL THEN p.monto ELSE 0 END), 0) -
       COALESCE(SUM(CASE WHEN p.tipo = 'PAGADO' AND p.monto > 0 THEN p.monto ELSE 0 END), 0))::numeric(15,2) AS saldo
    FROM partida p
    WHERE p.gestion = :gestion AND p.estado = 'ACTIVO'
    GROUP BY p.numero, p.descripcion
    ORDER BY p.numero ASC;
  `;

  const resultados = await sequelize.query(qry, {
    replacements: { gestion: anio },
    type: sequelize.QueryTypes.SELECT
  });

  return (resultados || []).map(r => ({
    numero: r.numero,
    descripcion: r.descripcion || '',
    inicial: aDecimal(aCentavos(r.inicial)),
    modificado: aDecimal(aCentavos(r.modificado)),
    vigente: aDecimal(aCentavos(r.vigente)),
    comprometido: aDecimal(aCentavos(r.comprometido)),
    pagado: aDecimal(aCentavos(r.pagado)),
    saldo: aDecimal(aCentavos(r.saldo)),
    saldo_formateado: formatearBolivianos(aCentavos(r.saldo)),
    vigente_formateado: formatearBolivianos(aCentavos(r.vigente))
  }));
}

/**
 * Calcula el resumen exacto por partida hasta con centavos para un grupo de partidas.
 */
async function obtenerResumenPartidas(modelPartida, Op, numerosPartida, gestion) {
  const anio = String(gestion || moment().tz('America/La_Paz').year());
  const listaNumeros = Array.isArray(numerosPartida)
    ? numerosPartida.map(String)
    : [String(numerosPartida)];

  if (listaNumeros.length === 0) return [];

  const registros = await modelPartida.findAll({
    attributes: ['id_partida', 'cite', 'numero', 'monto', 'fid_partida', 'gestion', 'tipo', 'estado'],
    where: {
      numero: { [Op.in]: listaNumeros },
      gestion: anio,
      estado: 'ACTIVO'
    },
    raw: true
  });

  // Agrupar y acumular en centavos enteros exactos
  const acum = {};

  for (const item of registros) {
    const num = item.numero;
    if (!acum[num]) {
      acum[num] = {
        partida: num,
        inicialCentavos: 0,
        modificadoCentavos: 0,
        comprometidoCentavos: 0,
        pagadoCentavos: 0
      };
    }

    const centavos = aCentavos(item.monto);
    if (item.tipo === 'INICIAL') {
      acum[num].inicialCentavos += centavos;
    } else if (item.tipo === 'MODIFICADO') {
      acum[num].modificadoCentavos += centavos;
    } else if (item.tipo === 'COMPROMETIDO' && item.fid_partida === null) {
      acum[num].comprometidoCentavos += centavos;
    } else if (item.tipo === 'PAGADO' && centavos > 0) {
      acum[num].pagadoCentavos += centavos;
    }
  }

  // Mapear resultado con fórmulas contables exactas
  return Object.values(acum).map(a => {
    const vigenteCentavos = a.inicialCentavos + a.modificadoCentavos;
    const saldoCentavos = vigenteCentavos - a.comprometidoCentavos - a.pagadoCentavos;

    return {
      partida: a.partida,
      inicial: aDecimal(a.inicialCentavos),
      modificado: aDecimal(a.modificadoCentavos),
      total: aDecimal(vigenteCentavos), // Vigente
      comprometido: aDecimal(a.comprometidoCentavos),
      pagado: aDecimal(a.pagadoCentavos),
      saldo: aDecimal(saldoCentavos),
      saldo_formateado: formatearBolivianos(saldoCentavos)
    };
  });
}

/**
 * Valida disponibilidad presupuestaria exacta para un documento de caja chica / POA.
 * Retorna { valido: boolean, saldos: Object, error: string|null }
 */
async function validarDisponibilidad(modelPartida, Op, itemsRequeridos, tipoOperacion, anioGestion) {
  const anio = String(anioGestion || moment().tz('America/La_Paz').year());
  const requerimientos = {}; // { 'numeroPartida': centavosRequeridos }

  for (const item of itemsRequeridos) {
    const num = item.partida && item.partida.numero ? item.partida.numero : item.numero || item.partida;
    if (!num) continue;
    const centavos = aCentavos(item.monto);
    requerimientos[num] = (requerimientos[num] || 0) + centavos;
  }

  const numeros = Object.keys(requerimientos);
  if (numeros.length === 0) return { valido: true, saldos: {}, error: null };

  const resumen = await obtenerResumenPartidas(modelPartida, Op, numeros, anio);
  const resumenMap = {};
  resumen.forEach(r => { resumenMap[r.partida] = r; });

  const saldosCalculados = {};

  for (const num of numeros) {
    const info = resumenMap[num];
    const centavosRequeridos = requerimientos[num];

    if (!info) {
      return {
        valido: false,
        error: `La partida número ${num} no se encuentra registrada para la gestión ${anio}.`,
        saldos: null
      };
    }

    const saldoActualCentavos = aCentavos(info.saldo);

    if (tipoOperacion === 'COMPROMETIDO') {
      if (saldoActualCentavos < centavosRequeridos) {
        return {
          valido: false,
          error: `La partida número ${num} no cuenta con saldo suficiente.<br>
                  Saldo disponible: Bs. ${formatearBolivianos(saldoActualCentavos)}<br>
                  Monto requerido: Bs. ${formatearBolivianos(centavosRequeridos)}`,
          saldos: null
        };
      }
      saldosCalculados[num] = {
        saldoInicial: aDecimal(saldoActualCentavos),
        montoComprometido: aDecimal(centavosRequeridos),
        saldoFinal: aDecimal(saldoActualCentavos - centavosRequeridos)
      };
    } else if (tipoOperacion === 'MODIFICADO') {
      if (centavosRequeridos < 0 && (saldoActualCentavos + centavosRequeridos) < 0) {
        return {
          valido: false,
          error: `La partida número ${num} no cuenta con saldo suficiente para la reducción presupuestaria solicitada.<br>
                  Saldo actual: Bs. ${formatearBolivianos(saldoActualCentavos)}<br>
                  Monto a reducir: Bs. ${formatearBolivianos(Math.abs(centavosRequeridos))}`,
          saldos: null
        };
      }
    }
  }

  return { valido: true, saldos: saldosCalculados, error: null };
}

module.exports = {
  aCentavos,
  aDecimal,
  formatearBolivianos,
  obtenerSaldosGestion,
  obtenerResumenPartidas,
  validarDisponibilidad
};
