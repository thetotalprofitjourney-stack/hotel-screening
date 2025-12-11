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
  const { rn: rn1, rooms_rev: rooms_rev1 } = await getY1CommercialAgg(project_id);
  if (rn1 <= 0 || rooms_rev1 <= 0) throw new Error('Y1_COMMERCIAL_NOT_READY');

  const occ1 = rn1 / (prj.habitaciones * 365);                // ocupación Y1
  const adr1 = rooms_rev1 / rn1;                               // ADR Y1

  const tamano_bucket_id = resolveTamanoBucket(prj.habitaciones);
  const ratios = await getRatios(prj.segmento, prj.categoria, tamano_bucket_id);

  // Porcentajes base (se “inflan” cada año si así se pide)
  const base = {
    dept_rooms_pct: Number(ratios.dept_rooms_pct),
    dept_rooms_eur_por_rn: Number(ratios.dept_rooms_eur_por_rn ?? 0),
    fb_food_cost_pct: Number(ratios.fb_food_cost_pct),
    fb_labor_pct: Number(ratios.fb_labor_pct),
    fb_otros_pct: Number(ratios.fb_otros_pct),
    dept_other_pct: Number(ratios.dept_other_pct),
    und_ag_pct: Number(ratios.und_ag_pct),
    und_it_pct: Number(ratios.und_it_pct),
    und_sm_pct: Number(ratios.und_sm_pct),
    und_pom_pct: Number(ratios.und_pom_pct),
    und_eww_pct: Number(ratios.und_eww_pct),
    r: Number(ratios.ratio_fb_sobre_rooms),
    a: Number(ratios.ratio_other_sobre_total),
    b: Number(ratios.ratio_misc_sobre_total),
  };

  const res: any[] = [];
  let occ = occ1;
  let adr = adr1;
  let pct = { ...base };

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
    if (y >= 2) {
      // aplica crecimiento
      adr = adr * (1 + assumptions.adr_growth_pct);
      occ = Math.max(0, Math.min(occ_cap, occ + (assumptions.occ_delta_pp / 100)));
      // “inflación” de % de costes (si se define)
      const kDept = (1 + (assumptions.cost_inflation_pct ?? 0));
      const kUnd  = (1 + (assumptions.undistributed_inflation_pct ?? 0));
      pct.dept_rooms_pct *= kDept;
      pct.fb_food_cost_pct *= kDept;
      pct.fb_labor_pct    *= kDept;
      pct.fb_otros_pct    *= kDept;
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
    }

    // RN anual y Rooms revenue
    const rn = occ * prj.habitaciones * 365;
    const rooms_rev = rn * adr;

    // Ingresos con r/a/b
    const total_sin_other_misc = rooms_rev * (1 + base.r);
    const total_rev = total_sin_other_misc / (1 - base.a - base.b);
    const fb = base.r * rooms_rev;
    const other = base.a * total_rev;
    const misc = base.b * total_rev;

    // Departamentales
    const dept_rooms = pct.dept_rooms_pct * rooms_rev + (base.dept_rooms_eur_por_rn ? base.dept_rooms_eur_por_rn * rn : 0);
    const dept_fb = (pct.fb_food_cost_pct + pct.fb_labor_pct + pct.fb_otros_pct) * fb;
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
