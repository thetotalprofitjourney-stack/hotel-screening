// Cálculo de deuda y utilidades financieras (anual)
export type DebtRow = { anio:number; intereses:number; amortizacion:number; cuota:number; saldo_final:number };

export function frenchLoanSchedule(P:number, rate:number, years:number): DebtRow[] {
  if (P <= 0 || rate < 0 || years <= 0) return [];
  const r = rate; // ya en tasa anual (p.ej. 0.05)
  const n = years;
  const cuota = r === 0 ? P / n : P * r / (1 - Math.pow(1 + r, -n));
  const out: DebtRow[] = [];
  let saldo = P;
  for (let y = 1; y <= n; y++) {
    const intereses = saldo * r;
    const amortizacion = Math.max(0, Math.min(saldo, cuota - intereses));
    saldo = Math.max(0, saldo - amortizacion);
    out.push({ anio: y, intereses, amortizacion, cuota: intereses + amortizacion, saldo_final: saldo });
  }
  return out;
}

export function bulletLoanSchedule(P:number, rate:number, years:number): DebtRow[] {
  if (P <= 0 || rate < 0 || years <= 0) return [];
  const r = rate;
  const out: DebtRow[] = [];
  for (let y = 1; y <= years; y++) {
    const intereses = P * r;
    const amortizacion = (y === years) ? P : 0;
    const cuota = intereses + amortizacion;
    const saldo_final = (y === years) ? 0 : P;
    out.push({ anio:y, intereses, amortizacion, cuota, saldo_final });
  }
  return out;
}

export function irr(cashflows:number[], guess=0.1): number | null {
  // Bisección robusta en [-0.99, 1] (≈ -99% a 100% anual)
  let lo = -0.99, hi = 1.0;
  const npv = (r:number)=> cashflows.reduce((acc,cf,i)=> acc + cf / Math.pow(1+r, i), 0);
  let npvLo = npv(lo), npvHi = npv(hi);
  if (npvLo * npvHi > 0) return null; // sin raíz en el rango
  for (let i=0;i<200;i++){
    const mid = (lo+hi)/2;
    const v = npv(mid);
    if (Math.abs(v) < 1e-8) return mid;
    if (v * npvLo > 0) { lo = mid; npvLo = v; } else { hi = mid; npvHi = v; }
  }
  return (lo+hi)/2;
}
