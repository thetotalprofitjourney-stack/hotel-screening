import { Y1Month } from '../types.js';

export function buildCommercialY1(
  meses: Array<{ mes:number; occ:number; adr:number }>,
  habitaciones: number,
  year: number
): Y1Month[] {
  const days = Array.from({ length: 12 }, (_, i) => new Date(year, i + 1, 0).getDate());
  return meses.map(m => {
    const rn = Math.round(m.occ * habitaciones * days[m.mes - 1]);
    const rooms_rev = m.adr * rn;
    return { mes: m.mes, occ: m.occ, adr: m.adr, rn, rooms_rev };
  });
}

export function calcUsaliY1Monthly(
  comm: Y1Month[],
  ratios: any,
  fees: { base_anual?:number; pct_gop?:number; incentive_pct?:number; hurdle_gop_margin?:number } | null,
  nonopAnnual: { taxes?:number; insurance?:number; rent?:number; other?:number } | null,
  ffe_pct: number
) {
  const nonop_m = ((nonopAnnual?.taxes ?? 0) + (nonopAnnual?.insurance ?? 0) + (nonopAnnual?.rent ?? 0) + (nonopAnnual?.other ?? 0)) / 12;
  const base_m = fees?.base_anual ? (fees.base_anual/12) : 0;

  const monthly = comm.map(row => {
    const rooms = row.rooms_rev;
    const r = Number(ratios.ratio_fb_sobre_rooms);
    const a = Number(ratios.ratio_other_sobre_total);
    const b = Number(ratios.ratio_misc_sobre_total);

    // Ingresos
    const total_sin_other_misc = rooms * (1 + r);
    const total_rev = total_sin_other_misc / (1 - a - b);
    const fb = r * rooms;
    const other = a * total_rev;
    const misc  = b * total_rev;

    // Dept expenses
    const dept_rooms = Number(ratios.dept_rooms_pct) * rooms
      + (ratios.dept_rooms_eur_por_rn ? Number(ratios.dept_rooms_eur_por_rn) * row.rn : 0);
    const dept_fb    = (Number(ratios.fb_food_cost_pct) + Number(ratios.fb_labor_pct) + Number(ratios.fb_otros_pct)) * fb;
    const dept_other = Number(ratios.dept_other_pct) * other;
    const dept_total = dept_rooms + dept_fb + dept_other;
    const dept_profit = total_rev - dept_total;

    // Undistributed
    const und_ag  = Number(ratios.und_ag_pct)  * total_rev;
    const und_it  = Number(ratios.und_it_pct)  * total_rev;
    const und_sm  = Number(ratios.und_sm_pct)  * total_rev;
    const und_pom = Number(ratios.und_pom_pct) * total_rev;
    const und_eww = Number(ratios.und_eww_pct) * total_rev;
    const und_total = und_ag + und_it + und_sm + und_pom + und_eww;

    const gop = dept_profit - und_total;

    // Fees
    const var_fee = fees?.pct_gop ? (fees.pct_gop * gop) : 0;
    const inc_fee = (fees?.incentive_pct && fees?.hurdle_gop_margin && (gop/total_rev >= fees.hurdle_gop_margin))
      ? (fees.incentive_pct * gop) : 0;
    const fees_total = base_m + var_fee + inc_fee;

    const income_before_nonop = gop - fees_total;

    // Non-operating (mensual prorrateado)
    const ebitda = income_before_nonop - nonop_m;

    const ffe_amount = ffe_pct * total_rev;
    const ebitda_less_ffe = ebitda - ffe_amount;

    return {
      mes: row.mes,
      rooms, fb, other_operated: other, misc_income: misc, total_rev,
      dept_rooms, dept_fb, dept_other, dept_total, dept_profit,
      und_ag, und_it, und_sm, und_pom, und_eww, und_total,
      gop, fees_base: base_m, fees_variable: var_fee, fees_incentive: inc_fee, fees_total,
      income_before_nonop, nonop_total: nonop_m,
      ebitda, ffe_amount, ebitda_less_ffe
    };
  });

  const sum = (k:string)=> monthly.reduce((acc:any,m:any)=> acc + Number(m[k]||0), 0);
  const y1_anual = {
    operating_revenue: sum('total_rev'),
    gop: sum('gop'),
    fees: sum('fees_total'),
    nonop: sum('nonop_total'),
    ebitda: sum('ebitda'),
    ffe: sum('ffe_amount'),
    ebitda_less_ffe: sum('ebitda_less_ffe'),
    gop_margin:         sum('gop') / Math.max(1, sum('total_rev')),
    ebitda_margin:      sum('ebitda') / Math.max(1, sum('total_rev')),
    ebitda_less_ffe_margin: sum('ebitda_less_ffe') / Math.max(1, sum('total_rev')),
  };

  return { monthly, y1_anual };
}
