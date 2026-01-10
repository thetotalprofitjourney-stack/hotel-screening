import { pool } from '../db.js';
import { frenchLoanSchedule, bulletLoanSchedule, irr } from './finance.js';

export async function computeDebt(project_id:string) {
  const [[ft]]: any = await pool.query(
    `SELECT precio_compra, capex_inicial, ltv, interes, plazo_anios, tipo_amortizacion
       FROM financing_terms WHERE project_id=?`, [project_id]
  );
  // Permitir plazo_anios = 0 (sin financiación), pero rechazar null/undefined
  if (!ft || ft.ltv==null || ft.interes==null || ft.plazo_anios==null || !ft.tipo_amortizacion)
    throw new Error('FINANCING_TERMS_INCOMPLETE');

  const base = Number(ft.precio_compra ?? 0) + Number(ft.capex_inicial ?? 0);
  const loan = Math.max(0, Number(ft.ltv) * base);
  const rate = Number(ft.interes);
  const years = Number(ft.plazo_anios);

  const sched = ft.tipo_amortizacion === 'bullet'
    ? bulletLoanSchedule(loan, rate, years)
    : frenchLoanSchedule(loan, rate, years);

  // Persist
  await pool.query(`DELETE FROM debt_schedule_annual WHERE project_id=?`, [project_id]);
  if (sched.length) {
    const ph = sched.map(()=>'(?,?,?,?,?,?)').join(',');
    const vals: any[] = [];
    sched.forEach(r => vals.push(project_id, r.anio, r.intereses, r.amortizacion, r.cuota, r.saldo_final));
    await pool.query(
      `INSERT INTO debt_schedule_annual (project_id, anio, intereses, amortizacion, cuota, saldo_final)
       VALUES ${ph}`, vals
    );
  }

  return { loan_amount: loan, schedule: sched };
}

export async function valuationAndReturns(project_id:string) {
  // Lee anualidades proyectadas
  const [annRows]: any = await pool.query(
    `SELECT anio, operating_revenue, ebitda, ebitda_less_ffe FROM usali_annual WHERE project_id=? ORDER BY anio`, [project_id]
  );
  if (!annRows.length) throw new Error('ANNUALS_NOT_FOUND');

  const [[ps]]: any = await pool.query(
    `SELECT metodo_valoracion, cap_rate_salida, multiplo_salida, coste_tx_compra_pct, coste_tx_venta_pct
       FROM project_settings WHERE project_id=?`, [project_id]
  );
  const [[ft]]: any = await pool.query(
    `SELECT precio_compra, capex_inicial, ltv FROM financing_terms WHERE project_id=?`, [project_id]
  );
  const [debt]: any = await pool.query(
    `SELECT anio, intereses, amortizacion, cuota, saldo_final FROM debt_schedule_annual WHERE project_id=? ORDER BY anio`, [project_id]
  );

  const years = annRows[annRows.length - 1].anio;

  // ✅ NUEVO CÁLCULO: NOI ESTABILIZADO (últimos 4 años ajustados al año de salida con 2% anual)
  const GROWTH_RATE = 0.02; // Parámetro interno fijo: 2% anual
  const NUM_YEARS_AVG = 4;  // Últimos 4 años

  // Tomar los últimos N años disponibles (máximo 4)
  const yearsToAvg = Math.min(NUM_YEARS_AVG, annRows.length);
  const relevantYears = annRows.slice(-yearsToAvg);

  // Ajustar cada NOI al año de salida
  const adjustedNOIs = relevantYears.map((r: any) => {
    const noi_year = Number(r.ebitda_less_ffe ?? r.ebitda);
    const years_to_exit = years - r.anio;
    const adjusted_noi = noi_year * Math.pow(1 + GROWTH_RATE, years_to_exit);
    return { anio: r.anio, noi_year, years_to_exit, adjusted_noi };
  });

  // Calcular media de los NOI ajustados
  const noi = adjustedNOIs.reduce((sum: number, item: any) => sum + item.adjusted_noi, 0) / yearsToAvg;

  let valor_salida_bruto = 0;
  if (ps.metodo_valoracion === 'multiplo') {
    if (!ps.multiplo_salida) throw new Error('MISSING_MULTIPLO');
    valor_salida_bruto = noi * Number(ps.multiplo_salida);
  } else {
    if (!ps.cap_rate_salida) throw new Error('MISSING_CAP_RATE');
    valor_salida_bruto = noi / Number(ps.cap_rate_salida);
  }
  const costs_sell = Number(ps.coste_tx_venta_pct ?? 0) * valor_salida_bruto;
  const valor_salida_neto = valor_salida_bruto - costs_sell;

  // ✅ NUEVO CÁLCULO: PRECIO DE COMPRA IMPLÍCITO
  // Tasa de descuento = cap rate de salida (o tasa implícita si se usa múltiplo)
  const discount_rate = ps.metodo_valoracion === 'cap_rate'
    ? Number(ps.cap_rate_salida ?? 0.08)
    : (1 / Number(ps.multiplo_salida ?? 12.5)); // Tasa implícita del múltiplo

  // Calcular PV de flujos operativos (años 1 a N)
  let pv_flujos_operativos = 0;
  for (let y = 1; y <= years; y++) {
    const r: any = annRows.find((a: any) => a.anio === y);
    const cash = Number(r.ebitda_less_ffe ?? r.ebitda);
    pv_flujos_operativos += cash / Math.pow(1 + discount_rate, y);
  }

  // Calcular PV del valor de salida neto
  const pv_exit = valor_salida_neto / Math.pow(1 + discount_rate, years);

  // Resolver para precio de compra que hace NPV = 0
  // NPV = -Precio_compra * (1 + pct_tx_compra) - capex_inicial + PV_flujos + PV_exit = 0
  // Precio_compra = (PV_flujos + PV_exit - capex_inicial) / (1 + pct_tx_compra)
  const capex_inicial = Number(ft.capex_inicial ?? 0);
  const pct_tx_compra = Number(ps.coste_tx_compra_pct ?? 0);

  const precio_compra_implicito = (pv_flujos_operativos + pv_exit - capex_inicial) / (1 + pct_tx_compra);

  // Equity inicial (t0)
  const precio_compra = Number(ft.precio_compra ?? 0);
  const base = precio_compra + Number(ft.capex_inicial ?? 0);
  const costs_buy = Number(ps.coste_tx_compra_pct ?? 0) * precio_compra; // Costes de transacción solo sobre precio de compra
  const loan0 = Number(ft.ltv ?? 0) * base;
  const equity0 = base + costs_buy - loan0;

  // Flujos UNLEVERED: -equity0 (negativo), +EBITDA_less_FFE anual, + valor salida neto en año N
  const cf_unlev: number[] = [-equity0];
  for (let y=1; y<=years; y++) {
    const r:any = annRows.find((a:any)=>a.anio===y);
    const cash = Number(r.ebitda_less_ffe ?? r.ebitda);
    if (y === years) cf_unlev.push(cash + valor_salida_neto);
    else cf_unlev.push(cash);
  }

  const irr_unlev = irr(cf_unlev);
  const moic_unlev = (cf_unlev.slice(1).reduce((a,b)=>a+b,0)) / Math.max(1e-9, -cf_unlev[0]);

  // Flujos LEVERED: -equity0; cada año: EBITDA_less_FFE - cuota deuda; año N: + venta neta - saldo_final
  const cf_lev: number[] = [-equity0];
  for (let y=1; y<=years; y++) {
    const r:any = annRows.find((a:any)=>a.anio===y)!;
    const debtRow:any = debt.find((d:any)=> d.anio===y) ?? { cuota:0, saldo_final:0 };
    const cash = Number(r.ebitda_less_ffe ?? r.ebitda) - Number(debtRow.cuota ?? 0);
    if (y === years) {
      const netExit = valor_salida_neto - Number(debtRow.saldo_final ?? 0);
      cf_lev.push(cash + netExit);
    } else {
      cf_lev.push(cash);
    }
  }
  const irr_lev = irr(cf_lev);
  const moic_lev = (cf_lev.slice(1).reduce((a,b)=>a+b,0)) / Math.max(1e-9, -cf_lev[0]);

  // Calcular LTV de salida
  const debtAtExit:any = debt.find((d:any)=> d.anio===years) ?? { saldo_final: 0 };
  const ltv_salida = valor_salida_bruto > 0
    ? Number(debtAtExit.saldo_final ?? 0) / valor_salida_bruto
    : null;

  // Persist
  await pool.query(
    `REPLACE INTO valuations (project_id, valor_salida_bruto, valor_salida_neto, ltv_salida, noi_estabilizado, precio_compra_implicito, discount_rate)
     VALUES (?,?,?,?,?,?,?)`,
    [project_id, valor_salida_bruto, valor_salida_neto, ltv_salida, noi, precio_compra_implicito, discount_rate]
  );
  // Calcular yield on cost del año 1 (buscando explícitamente anio=1)
  const y1 = annRows.find((r:any) => r.anio === 1);
  const yield_on_cost_y1 = y1 && (base + costs_buy) > 0
    ? Number(y1.ebitda_less_ffe) / (base + costs_buy)
    : null;

  await pool.query(
    `REPLACE INTO returns (project_id, irr_unlevered, moic_unlevered, yield_on_cost_y1, irr_levered, moic_levered, payback_anios, fcfe_json)
     VALUES (?,?,?,?,?,?,?,?)`,
    [
      project_id,
      irr_unlev ?? null,
      moic_unlev ?? null,
      yield_on_cost_y1,
      irr_lev ?? null,
      moic_lev ?? null,
      null,
      JSON.stringify(cf_lev)
    ]
  );

  // Actualizar estado del proyecto a finalized
  await pool.query(`UPDATE projects SET estado='finalized', updated_at=NOW(3) WHERE project_id=?`, [project_id]);

  return {
    valuation: {
      valor_salida_bruto,
      valor_salida_neto,
      noi_estabilizado: noi,
      noi_details: {
        years_used: yearsToAvg,
        growth_rate: GROWTH_RATE,
        adjusted_nois: adjustedNOIs
      },
      precio_compra_implicito,
      precio_compra_real: Number(ft.precio_compra ?? 0),
      discount_rate
    },
    returns: {
      unlevered: { irr: irr_unlev, moic: moic_unlev },
      levered:   { irr: irr_lev,   moic: moic_lev, equity0 }
    },
    cashflows: { unlevered: cf_unlev, levered: cf_lev }
  };
}
