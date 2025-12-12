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
  fees_indexation_pct?: number | null; // override (si null usa operator_contracts)
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
            oc.operacion_tipo, oc.fee_base_anual, oc.fee_pct_gop, oc.fee_incentive_pct, oc.fee_hurdle_gop_margin, oc.fees_indexacion_pct_anual,
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
    `SELECT rn, operating_revenue, dept_profit, gop, fees, nonop, ebitda, ffe, ebitda_less_ffe,
            gop_margin, ebitda_margin, ebitda_less_ffe_margin
     FROM usali_annual
     WHERE project_id=? AND anio=1`,
    [project_id]
  );

  // Si no existe Y1 guardado, lanzar error
  if (!y1Saved) {
    throw new Error('Y1_NOT_SAVED_YET: Debes guardar el USALI Y1 antes de proyectar');
  }

  // Obtener datos comerciales de Y1 para calcular occ y ADR base
  const { rn: rn1, rooms_rev: rooms_rev1 } = await getY1CommercialAgg(project_id);
  if (rn1 <= 0 || rooms_rev1 <= 0) throw new Error('Y1_COMMERCIAL_NOT_READY');

  const occ1 = rn1 / (prj.habitaciones * 365);                // ocupación Y1
  const adr1 = rooms_rev1 / rn1;                               // ADR Y1

  // ✅ CALCULAR PORCENTAJES REALES DEL Y1 GUARDADO (no usar ratios de mercado)
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

  // Sumar totales anuales del Y1 guardado
  const sum = (field: string) => (y1Monthly as any[]).reduce((acc: number, m: any) => acc + Number(m[field] || 0), 0);

  const y1_total_rooms = sum('rooms');
  const y1_total_fb = sum('fb');
  const y1_total_other = sum('other_operated');
  const y1_total_misc = sum('misc_income');
  const y1_total_rev = sum('total_rev');
  const y1_dept_rooms = sum('dept_rooms');
  const y1_dept_fb = sum('dept_fb');
  const y1_dept_other = sum('dept_other');
  const y1_und_ag = sum('und_ag');
  const y1_und_it = sum('und_it');
  const y1_und_sm = sum('und_sm');
  const y1_und_pom = sum('und_pom');
  const y1_und_eww = sum('und_eww');

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
  const fee_pct_gop = Number(prj.fee_pct_gop ?? 0);
  const fee_incentive_pct = Number(prj.fee_incentive_pct ?? 0);
  const fee_hurdle = Number(prj.fee_hurdle_gop_margin ?? 0);
  let fee_base_year = base_fee;

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
      // ✅ AÑO 1: Usar datos guardados de usali_annual (editados por el usuario)
      res.push({
        anio: 1,
        occupancy: occ1,
        adr: adr1,
        rn: Number(y1Saved.rn),
        rooms_rev: rooms_rev1,
        fb: 0, // No guardamos este detalle en usali_annual
        other_operated: 0,
        misc_income: 0,
        operating_revenue: Number(y1Saved.operating_revenue),
        dept_profit: Number(y1Saved.dept_profit),
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

    // ✅ AÑOS 2-N: Proyectar con crecimientos e inflaciones
    // aplica crecimiento
    adr = adr * (1 + assumptions.adr_growth_pct);
    occ = Math.max(0, Math.min(occ_cap, occ + (assumptions.occ_delta_pp / 100)));
    // "inflación" de % de costes (si se define)
    const kDept = (1 + (assumptions.cost_inflation_pct ?? 0));
    const kUnd  = (1 + (assumptions.undistributed_inflation_pct ?? 0));
    pct.dept_rooms_pct *= kDept;
    pct.fb_total_pct *= kDept;  // ✅ Usar fb_total_pct del Y1 guardado
    pct.dept_other_pct  *= kDept;
    pct.und_ag_pct *= kUnd; pct.und_it_pct *= kUnd; pct.und_sm_pct *= kUnd; pct.und_pom_pct *= kUnd; pct.und_eww_pct *= kUnd;

    // indexación fees base
    const indexPct = (assumptions.fees_indexation_pct ?? prj.fees_indexacion_pct_anual ?? 0);
    fee_base_year = fee_base_year * (1 + indexPct);

    // non-op inflación
    const kNonOp = (1 + (assumptions.nonop_inflation_pct ?? 0));
    nonop = {
      taxes: nonop.taxes * kNonOp,
      insurance: nonop.insurance * kNonOp,
      rent: nonop.rent * kNonOp,
      other: nonop.other * kNonOp
    };

    // RN anual y Rooms revenue
    const rn = occ * prj.habitaciones * 365;
    const rooms_rev = rn * adr;

    // Ingresos con r/a/b (usar ratios del Y1 guardado)
    const total_sin_other_misc = rooms_rev * (1 + pct.r);
    const total_rev = total_sin_other_misc / (1 - pct.a - pct.b);
    const fb = pct.r * rooms_rev;
    const other = pct.a * total_rev;
    const misc = pct.b * total_rev;

    // Departamentales (usar porcentajes del Y1 guardado)
    const dept_rooms = pct.dept_rooms_pct * rooms_rev;
    const dept_fb = pct.fb_total_pct * fb;  // ✅ Usar fb_total_pct del Y1 guardado
    const dept_other = pct.dept_other_pct * other;
    const dept_total = dept_rooms + dept_fb + dept_other;
    const dept_profit = total_rev - dept_total;

    // Undistributed
    const und_ag = pct.und_ag_pct * total_rev;
    const und_it = pct.und_it_pct * total_rev;
    const und_sm = pct.und_sm_pct * total_rev;
    const und_pom = pct.und_pom_pct * total_rev;
    const und_eww = pct.und_eww_pct * total_rev;
    const und_total = und_ag + und_it + und_sm + und_pom + und_eww;

    const gop = dept_profit - und_total;

    // Fees operador
    const fees_base = prj.operacion_tipo === 'operador' ? fee_base_year : 0;
    const fees_variable = prj.operacion_tipo === 'operador' ? (fee_pct_gop * gop) : 0;
    const fees_incentive = (prj.operacion_tipo === 'operador' && fee_incentive_pct && fee_hurdle && (gop/total_rev >= fee_hurdle))
      ? (fee_incentive_pct * gop) : 0;
    const fees_total = fees_base + fees_variable + fees_incentive;

    const income_before_nonop = gop - fees_total;

    const nonop_total = nonop.taxes + nonop.insurance + nonop.rent + nonop.other;

    const ebitda = income_before_nonop - nonop_total;

    const ffe_amount = ffe_pct * total_rev;
    const ebitda_less_ffe = ebitda - ffe_amount;

    res.push({
      anio: y,
      occupancy: occ,
      adr,
      rn, // Roomnights anuales
      rooms_rev, fb, other_operated: other, misc_income: misc,
      operating_revenue: total_rev,
      dept_profit, // Dept Profit
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
    .map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
  for (const r of res.filter(r => r.anio >= 2)) {
    values.push(
      project_id, r.anio, r.rn, r.operating_revenue, r.dept_profit,
      r.gop, r.fees, r.nonop, r.ebitda, r.ffe, r.ebitda_less_ffe,
      r.gop_margin, r.ebitda_margin, r.ebitda_less_ffe_margin
    );
  }
  if (values.length) {
    await pool.query(
      `INSERT INTO usali_annual
       (project_id,anio,rn,operating_revenue,dept_profit,gop,fees,nonop,ebitda,ffe,ebitda_less_ffe,gop_margin,ebitda_margin,ebitda_less_ffe_margin)
       VALUES ${placeholders}
       ON DUPLICATE KEY UPDATE
         rn=VALUES(rn),
         operating_revenue=VALUES(operating_revenue),
         dept_profit=VALUES(dept_profit),
         gop=VALUES(gop), fees=VALUES(fees), nonop=VALUES(nonop),
         ebitda=VALUES(ebitda), ffe=VALUES(ffe), ebitda_less_ffe=VALUES(ebitda_less_ffe),
         gop_margin=VALUES(gop_margin), ebitda_margin=VALUES(ebitda_margin), ebitda_less_ffe_margin=VALUES(ebitda_less_ffe_margin)`,
      values
    );
  }

  // Actualizar estado del proyecto a projection_2n
  await pool.query(`UPDATE projects SET estado='projection_2n', updated_at=NOW(3) WHERE project_id=?`, [project_id]);

  return res;
}
