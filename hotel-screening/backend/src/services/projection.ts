import { pool } from '../db.js';
import { resolveTamanoBucket } from './utils.js';
import { getRatios } from './ratios.js';

type Assumptions = {
  years?: number;                 // default: horizonte del proyecto
  anio_base?: number;             // para días del año (si lo necesitas)
  adr_growth_pct: number;         // p.ej. 0.05
  occ_delta_pp: number;           // p.ej. +1.5 (puntos porcentuales por año)
  occ_cap: number;                // p.ej. 0.85 (85%)
  cost_inflation_pct: number;     // aplica a % dept y F&B %
  undistributed_inflation_pct: number; // aplica a % undistributed
  nonop_inflation_pct: number;    // aplica a non-operating € (impuestos, seguros, etc.)
};

// Helper para sumar campos de y1_commercial
async function getY1CommercialAgg(project_id:string) {
  const [[rooms]]: any = await pool.query(
    `SELECT SUM(y1_mes_rn) as rn, SUM(y1_mes_rooms_rev) as rooms_rev
       FROM y1_commercial WHERE project_id=?`, [project_id]
  );
  return { rn: Number(rooms?.rn ?? 0), rooms_rev: Number(rooms?.rooms_rev ?? 0) };
}

export async function projectYears(project_id: string, assumptions: Assumptions) {
  // Lee parámetros del proyecto
  const [[prj]]: any = await pool.query(
    `SELECT p.horizonte, p.segmento, p.categoria, p.habitaciones,
            ps.ffe,
            oc.operacion_tipo, oc.fee_base_anual, oc.fee_pct_total_rev, oc.fee_pct_gop, oc.fee_incentive_pct, oc.fee_hurdle_gop_margin, oc.gop_ajustado,
            no.nonop_taxes_anual, no.nonop_insurance_anual, no.nonop_rent_anual, no.nonop_other_anual
       FROM projects p
       JOIN project_settings ps ON ps.project_id=p.project_id
       JOIN operator_contracts oc ON oc.project_id=p.project_id
       JOIN nonoperating_assumptions no ON no.project_id=p.project_id
      WHERE p.project_id=?`, [project_id]
  );
  if (!prj) throw new Error('PROJECT_NOT_FOUND');

  const horizon = Math.max(1, Number(assumptions.years ?? prj.horizonte));

  // Verificar si existe Y1 guardado en usali_annual
  const [[y1Saved]]: any = await pool.query(
    `SELECT rn, operating_revenue, dept_total, dept_profit, und_total, gop, fees, nonop, ebitda, ffe, ebitda_less_ffe,
            gop_margin, ebitda_margin, ebitda_less_ffe_margin
     FROM usali_annual
     WHERE project_id=? AND anio=1`,
    [project_id]
  );

  // Si no existe Y1 guardado, lanzar error
  if (!y1Saved) {
    throw new Error('Y1_NOT_SAVED_YET: Debes guardar el USALI Y1 antes de proyectar');
  }

  // ✅ LEER TODOS LOS DATOS DEL Y1 DESDE usali_y1_monthly (fuente única de verdad)
  // Leer datos mensuales guardados del Y1
  const [y1Monthly]: any = await pool.query(
    `SELECT rooms, fb, other_operated, misc_income, total_rev,
            dept_rooms, dept_fb, dept_other,
            und_ag, und_it, und_sm, und_pom, und_eww
     FROM usali_y1_monthly
     WHERE project_id=?
     ORDER BY mes`,
    [project_id]
  );

  if (!y1Monthly || y1Monthly.length === 0) {
    throw new Error('Y1_USALI_NOT_SAVED: Debes guardar el USALI Y1 antes de proyectar');
  }

  // Sumar totales anuales del Y1 guardado (fuente única de verdad)
  const sum = (field: string) => (y1Monthly as any[]).reduce((acc: number, m: any) => acc + Number(m[field] || 0), 0);

  const y1_total_rooms = sum('rooms');
  const y1_total_fb = sum('fb');
  const y1_total_other = sum('other_operated');
  const y1_total_misc = sum('misc_income');
  const y1_total_rev = sum('total_rev');

  // Obtener suma de días de operativa del año 1 desde y1_commercial
  const [y1CommercialDays]: any = await pool.query(
    `SELECT SUM(y1_mes_dias) as total_dias
     FROM y1_commercial
     WHERE project_id=?`,
    [project_id]
  );
  const suma_dias_y1 = Number(y1CommercialDays[0]?.total_dias ?? 365);

  // Calcular RN desde y1_saved (debe coincidir con los ingresos)
  const rn1 = Number(y1Saved.rn);
  if (rn1 <= 0 || y1_total_rooms <= 0) throw new Error('Y1_DATA_INCOMPLETE');

  // Calcular occ y ADR desde los datos guardados
  // ✅ CORRECCIÓN: Usar suma de días de operativa del año 1, no 365 días
  const occ1 = rn1 / (prj.habitaciones * suma_dias_y1);
  const adr1 = y1_total_rooms / rn1;  // ✅ Usar y1_total_rooms (de usali_y1_monthly), no rooms_rev1
  const y1_dept_rooms = sum('dept_rooms');
  const y1_dept_fb = sum('dept_fb');
  const y1_dept_other = sum('dept_other');
  const y1_dept_total = y1_dept_rooms + y1_dept_fb + y1_dept_other;

  const y1_und_ag = sum('und_ag');
  const y1_und_it = sum('und_it');
  const y1_und_sm = sum('und_sm');
  const y1_und_pom = sum('und_pom');
  const y1_und_eww = sum('und_eww');
  const y1_und_total = y1_und_ag + y1_und_it + y1_und_sm + y1_und_pom + y1_und_eww;

  // Calcular porcentajes REALES del Y1 guardado
  const realY1Pct = {
    // Departamentales como % de su línea de ingreso correspondiente
    dept_rooms_pct: y1_total_rooms > 0 ? y1_dept_rooms / y1_total_rooms : 0,
    dept_rooms_eur_por_rn: 0, // No usamos este campo en la proyección de Y1 editado

    // FB: separamos los 3 componentes (food cost, labor, otros) del total dept_fb
    // Como no guardamos el detalle, calculamos el total como % de FB revenue
    fb_total_pct: y1_total_fb > 0 ? y1_dept_fb / y1_total_fb : 0,
    fb_food_cost_pct: 0, // Se usará fb_total_pct en su lugar
    fb_labor_pct: 0,
    fb_otros_pct: 0,

    dept_other_pct: y1_total_other > 0 ? y1_dept_other / y1_total_other : 0,

    // Undistributed como % del total revenue
    und_ag_pct: y1_total_rev > 0 ? y1_und_ag / y1_total_rev : 0,
    und_it_pct: y1_total_rev > 0 ? y1_und_it / y1_total_rev : 0,
    und_sm_pct: y1_total_rev > 0 ? y1_und_sm / y1_total_rev : 0,
    und_pom_pct: y1_total_rev > 0 ? y1_und_pom / y1_total_rev : 0,
    und_eww_pct: y1_total_rev > 0 ? y1_und_eww / y1_total_rev : 0,

    // Ratios de ingresos (mantener los mismos del Y1)
    r: y1_total_rooms > 0 ? y1_total_fb / y1_total_rooms : 0,
    a: y1_total_rev > 0 ? y1_total_other / y1_total_rev : 0,
    b: y1_total_rev > 0 ? y1_total_misc / y1_total_rev : 0,
  };

  const res: any[] = [];
  let occ = occ1;
  let adr = adr1;
  let pct = { ...realY1Pct }; // ✅ Usar porcentajes REALES del Y1 guardado, no ratios de mercado

  // Leo fees y non-op iniciales
  const base_fee = Number(prj.fee_base_anual ?? 0);
  const fee_pct_total_rev = Number(prj.fee_pct_total_rev ?? 0);
  const fee_pct_gop = Number(prj.fee_pct_gop ?? 0);
  const fee_incentive_pct = Number(prj.fee_incentive_pct ?? 0);
  const fee_hurdle = Number(prj.fee_hurdle_gop_margin ?? 0);
  const gop_ajustado = Boolean(prj.gop_ajustado ?? false);

  let nonop = {
    taxes: Number(prj.nonop_taxes_anual ?? 0),
    insurance: Number(prj.nonop_insurance_anual ?? 0),
    rent: Number(prj.nonop_rent_anual ?? 0),
    other: Number(prj.nonop_other_anual ?? 0)
  };

  const occ_cap = Math.max(0, Math.min(1, assumptions.occ_cap));
  const ffe_pct = Number(prj.ffe);

  for (let y = 1; y <= horizon; y++) {
    if (y === 1) {
      // ✅ AÑO 1: Usar datos guardados directamente de usali_y1_monthly (editados por el usuario)
      // Ocupación financiera (sobre inventario total de 365 días)
      const inventario_total_y1 = prj.habitaciones * 365;
      const occupancy_financiera_y1 = inventario_total_y1 > 0 ? rn1 / inventario_total_y1 : 0;

      res.push({
        anio: 1,
        occupancy: occ1,
        occupancy_financiera: occupancy_financiera_y1, // Nueva: ocupación sobre 365 días
        adr: adr1,
        rn: rn1,
        rooms_rev: y1_total_rooms,  // ✅ Usar valor de usali_y1_monthly
        fb: y1_total_fb,            // ✅ Usar valor de usali_y1_monthly
        other_operated: y1_total_other,  // ✅ Usar valor de usali_y1_monthly
        misc_income: y1_total_misc,      // ✅ Usar valor de usali_y1_monthly
        operating_revenue: Number(y1Saved.operating_revenue),
        dept_total: y1_dept_total,
        dept_profit: Number(y1Saved.dept_profit),
        und_total: y1_und_total,
        gop: Number(y1Saved.gop),
        fees: Number(y1Saved.fees),
        nonop: Number(y1Saved.nonop),
        ebitda: Number(y1Saved.ebitda),
        ffe: Number(y1Saved.ffe),
        ebitda_less_ffe: Number(y1Saved.ebitda_less_ffe),
        gop_margin: Number(y1Saved.gop_margin),
        ebitda_margin: Number(y1Saved.ebitda_margin),
        ebitda_less_ffe_margin: Number(y1Saved.ebitda_less_ffe_margin)
      });
      continue; // Saltar al siguiente año
    }

    // ✅ AÑOS 2-N: Proyectar aplicando crecimientos sobre el año anterior

    // Aplicar crecimientos a ADR y ocupación
    adr = adr * (1 + assumptions.adr_growth_pct);
    const occ_new = Math.max(0, Math.min(occ_cap, occ + (assumptions.occ_delta_pp / 100)));

    // Calcular factor de crecimiento de ingresos (compuesto de ADR y ocupación)
    const adr_factor = (1 + assumptions.adr_growth_pct);
    const occ_factor = occ > 0 ? occ_new / occ : 1;
    const revenue_growth = adr_factor * occ_factor;

    occ = occ_new;  // Actualizar ocupación para siguiente año

    // ✅ APLICAR CRECIMIENTO DIRECTAMENTE SOBRE INGRESOS DEL AÑO ANTERIOR
    // Obtener datos del año anterior (y-1 está en posición y-2 del array res)
    const prev_year = res[y - 2];
    const rooms_rev = prev_year.rooms_rev * revenue_growth;
    const fb = prev_year.fb * revenue_growth;
    const other = prev_year.other_operated * revenue_growth;
    const misc = prev_year.misc_income * revenue_growth;
    const total_rev = rooms_rev + fb + other + misc;

    // RN (roomnights) anual actualizado
    // ✅ CORRECCIÓN: Usar suma de días de operativa del año 1, no 365 días
    const rn = occ * prj.habitaciones * suma_dias_y1;

    // ✅ CORRECCIÓN: Aplicar inflación de costes sobre €/RN (igual que Total Rev)
    const kDept = (1 + (assumptions.cost_inflation_pct ?? 0));
    const kUnd  = (1 + (assumptions.undistributed_inflation_pct ?? 0));

    // Calcular dept_total aplicando inflación sobre €/RN del año anterior
    const prev_dept_total_per_rn = prev_year.rn > 0 ? prev_year.dept_total / prev_year.rn : 0;
    const dept_total = prev_dept_total_per_rn * kDept * rn;

    // Distribuir dept_total entre componentes según proporciones de ingresos
    const total_operated_rev = rooms_rev + fb + other;
    const dept_rooms = total_operated_rev > 0 ? dept_total * (rooms_rev / total_operated_rev) : 0;
    const dept_fb = total_operated_rev > 0 ? dept_total * (fb / total_operated_rev) : 0;
    const dept_other = total_operated_rev > 0 ? dept_total * (other / total_operated_rev) : 0;

    // Recalcular porcentajes para referencia (no se usan en cálculos posteriores)
    pct.dept_rooms_pct = rooms_rev > 0 ? dept_rooms / rooms_rev : pct.dept_rooms_pct;
    pct.fb_total_pct = fb > 0 ? dept_fb / fb : pct.fb_total_pct;
    pct.dept_other_pct = other > 0 ? dept_other / other : pct.dept_other_pct;

    // Calcular undistributed aplicando inflación sobre el total del año anterior
    const und_total_inflado = prev_year.und_total * kUnd;

    // Calcular suma de porcentajes para mantener proporciones
    const suma_pct_und = pct.und_ag_pct + pct.und_it_pct + pct.und_sm_pct + pct.und_pom_pct + pct.und_eww_pct;

    // Distribuir el total inflado manteniendo las proporciones del Y1
    const und_ag = suma_pct_und > 0 ? und_total_inflado * (pct.und_ag_pct / suma_pct_und) : und_total_inflado / 5;
    const und_it = suma_pct_und > 0 ? und_total_inflado * (pct.und_it_pct / suma_pct_und) : und_total_inflado / 5;
    const und_sm = suma_pct_und > 0 ? und_total_inflado * (pct.und_sm_pct / suma_pct_und) : und_total_inflado / 5;
    const und_pom = suma_pct_und > 0 ? und_total_inflado * (pct.und_pom_pct / suma_pct_und) : und_total_inflado / 5;
    const und_eww = suma_pct_und > 0 ? und_total_inflado * (pct.und_eww_pct / suma_pct_und) : und_total_inflado / 5;

    // non-op inflación
    const kNonOp = (1 + (assumptions.nonop_inflation_pct ?? 0));
    nonop = {
      taxes: nonop.taxes * kNonOp,
      insurance: nonop.insurance * kNonOp,
      rent: nonop.rent * kNonOp,
      other: nonop.other * kNonOp
    };
    const dept_profit = total_rev - dept_total;

    // Undistributed (ya calculados arriba con inflación)
    const und_total = und_ag + und_it + und_sm + und_pom + und_eww;

    const gop = dept_profit - und_total;

    // FF&E amount (calculado antes para poder usarlo en GOP ajustado)
    const ffe_amount = ffe_pct * total_rev;

    // Determinar GOP base para cálculo de fees (GOP estándar o GOP ajustado)
    const gop_for_fees = gop_ajustado ? (gop - ffe_amount) : gop;

    // Fees operador - Recalcular en función de KPIs del año actual
    const fee_total_rev = prj.operacion_tipo === 'operador' ? (fee_pct_total_rev * total_rev) : 0;
    const fees_base = prj.operacion_tipo === 'operador' ? (base_fee + fee_total_rev) : 0;
    const fees_variable = prj.operacion_tipo === 'operador' ? (fee_pct_gop * gop_for_fees) : 0;
    const fees_incentive = (prj.operacion_tipo === 'operador' && fee_incentive_pct && fee_hurdle && (gop_for_fees/total_rev >= fee_hurdle))
      ? (fee_incentive_pct * gop_for_fees) : 0;
    const fees_total = fees_base + fees_variable + fees_incentive;

    const income_before_nonop = gop - fees_total;

    const nonop_total = nonop.taxes + nonop.insurance + nonop.rent + nonop.other;

    const ebitda = income_before_nonop - nonop_total;

    const ebitda_less_ffe = ebitda - ffe_amount;

    // Ocupación financiera (sobre inventario total de 365 días)
    const inventario_total = prj.habitaciones * 365;
    const occupancy_financiera = inventario_total > 0 ? rn / inventario_total : 0;

    res.push({
      anio: y,
      occupancy: occ,
      occupancy_financiera, // Nueva: ocupación sobre 365 días
      adr,
      rn, // Roomnights anuales
      rooms_rev, fb, other_operated: other, misc_income: misc,
      operating_revenue: total_rev,
      dept_total,
      dept_profit, // Dept Profit
      und_total,
      gop, fees: fees_total, nonop: nonop_total,
      ebitda, ffe: ffe_amount, ebitda_less_ffe,
      gop_margin: total_rev ? gop/total_rev : 0,
      ebitda_margin: total_rev ? ebitda/total_rev : 0,
      ebitda_less_ffe_margin: total_rev ? ebitda_less_ffe/total_rev : 0
    });
  }

  // Persistir (limpiamos años >=2 y reescribimos)
  await pool.query(`DELETE FROM usali_annual WHERE project_id=? AND anio>=2`, [project_id]);
  const values: any[] = [];
  const placeholders = res
    .filter(r => r.anio >= 2)
    .map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
  for (const r of res.filter(r => r.anio >= 2)) {
    values.push(
      project_id, r.anio, r.rn, r.operating_revenue, r.dept_total, r.dept_profit,
      r.und_total, r.gop, r.fees, r.nonop, r.ebitda, r.ffe, r.ebitda_less_ffe,
      r.gop_margin, r.ebitda_margin, r.ebitda_less_ffe_margin
    );
  }
  if (values.length) {
    await pool.query(
      `INSERT INTO usali_annual
       (project_id,anio,rn,operating_revenue,dept_total,dept_profit,und_total,gop,fees,nonop,ebitda,ffe,ebitda_less_ffe,gop_margin,ebitda_margin,ebitda_less_ffe_margin)
       VALUES ${placeholders}
       ON DUPLICATE KEY UPDATE
         rn=VALUES(rn),
         operating_revenue=VALUES(operating_revenue),
         dept_total=VALUES(dept_total),
         dept_profit=VALUES(dept_profit),
         und_total=VALUES(und_total),
         gop=VALUES(gop), fees=VALUES(fees), nonop=VALUES(nonop),
         ebitda=VALUES(ebitda), ffe=VALUES(ffe), ebitda_less_ffe=VALUES(ebitda_less_ffe),
         gop_margin=VALUES(gop_margin), ebitda_margin=VALUES(ebitda_margin), ebitda_less_ffe_margin=VALUES(ebitda_less_ffe_margin)`,
      values
    );
  }

  // Guardar los supuestos de proyección usados (si la tabla existe)
  try {
    await pool.query(
      `REPLACE INTO projection_assumptions
       (project_id, adr_growth_pct, occ_delta_pp, occ_cap, cost_inflation_pct, undistributed_inflation_pct, nonop_inflation_pct)
       VALUES (?,?,?,?,?,?,?)`,
      [
        project_id,
        assumptions.adr_growth_pct,
        assumptions.occ_delta_pp,
        assumptions.occ_cap,
        assumptions.cost_inflation_pct ?? 0,
        assumptions.undistributed_inflation_pct ?? 0,
        assumptions.nonop_inflation_pct ?? 0
      ]
    );
  } catch (err: any) {
    // Si la tabla no existe, continuar sin error (se guardará después de ejecutar migraciones)
    if (err.code !== 'ER_NO_SUCH_TABLE') {
      throw err;
    }
    console.warn('⚠️ projection_assumptions table does not exist yet. Run migration 011.');
  }

  // Actualizar estado del proyecto a projection_2n
  await pool.query(`UPDATE projects SET estado='projection_2n', updated_at=NOW(3) WHERE project_id=?`, [project_id]);

  return res;
}
