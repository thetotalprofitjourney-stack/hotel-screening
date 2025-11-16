import React, { useEffect, useState } from 'react';
import { api } from '../api';
import MonthlyTable from '../components/MonthlyTable';

export default function Wizard({ projectId, onBack }:{ projectId:string; onBack:()=>void }) {
  const [anio, setAnio] = useState<number>(new Date().getFullYear());
  const [meses, setMeses] = useState<any[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [calc, setCalc] = useState<any|null>(null);
  // nuevos estados
  const [ass, setAss] = useState({
    years: 7,
    adr_growth_pct: 0.05,
    occ_delta_pp: 1.0,
    occ_cap: 0.85,
    cost_inflation_pct: 0.02,
    undistributed_inflation_pct: 0.02,
    nonop_inflation_pct: 0.02,
    fees_indexation_pct: null as number | null
  });
  const [annuals, setAnnuals] = useState<any[]|null>(null);
  const [debt, setDebt] = useState<any|null>(null);
  const [vr, setVR] = useState<any|null>(null);

  async function loadBenchmark() {
    const data = await api(`/v1/projects/${projectId}/y1/benchmark?anio_base=${anio}`);
    setMeses(data.meses.map((m:any)=>({ ...m, ocupacion:m.occ, adr:m.adr })));
  }

  useEffect(()=>{ loadBenchmark().catch(console.error); },[anio, projectId]);

  async function accept() {
    await api(`/v1/projects/${projectId}/y1/benchmark/accept`, {
      method:'POST',
      body: JSON.stringify({ anio_base: anio, meses: meses.map((m:any)=>({ mes:m.mes, ocupacion:m.ocupacion, adr:m.adr })) })
    });
    setAccepted(true);
  }

  async function calcY1() {
    const r = await api(`/v1/projects/${projectId}/y1/calc`, { method:'POST', body: JSON.stringify({}) });
    setCalc(r);
  }

  async function doProjection() {
    const r = await api(`/v1/projects/${projectId}/projection`, { method:'POST', body: JSON.stringify(ass) });
    setAnnuals(r.annuals);
  }
  async function doDebt() {
    const r = await api(`/v1/projects/${projectId}/debt`, { method:'POST', body: JSON.stringify({}) });
    setDebt(r);
  }
  async function doValuation() {
    const r = await api(`/v1/projects/${projectId}/valuation-and-returns`, { method:'POST', body: JSON.stringify({}) });
    setVR(r);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <button className="px-2 py-1 border rounded" onClick={onBack}>← Volver</button>
        <div className="flex items-center gap-2">
          <span>Año base</span>
          <input className="border px-2 py-1 rounded w-24" type="number" value={anio} onChange={e=>setAnio(Number(e.target.value))} />
          <button className="px-2 py-1 border rounded" onClick={loadBenchmark}>Recargar</button>
        </div>
      </div>

      <section>
        <h3 className="text-lg font-semibold mb-2">Paso 1 — Validación comercial Y1</h3>
        <MonthlyTable rows={meses} onChange={setMeses} />
        <button className="mt-3 px-3 py-2 bg-black text-white rounded" onClick={accept}>Aceptar Y1 comercial</button>
      </section>

      {accepted && (
        <section>
          <h3 className="text-lg font-semibold mb-2">Paso 2 — Cálculo USALI Y1</h3>
          <button className="px-3 py-2 bg-black text-white rounded" onClick={calcY1}>Calcular USALI</button>
          {calc && (
            <div className="mt-4">
              <h4 className="font-semibold">Resumen anual</h4>
              <div className="grid grid-cols-3 gap-3 mt-2">
                <Stat label="Ingresos" value={calc.y1_anual.operating_revenue} />
                <Stat label="GOP" value={calc.y1_anual.gop} />
                <Stat label="EBITDA" value={calc.y1_anual.ebitda} />
              </div>
              <h4 className="font-semibold mt-4">Mensual (USALI)</h4>
              <div className="overflow-auto">
                <table className="w-full text-sm border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2">Mes</th>
                      <th className="p-2">Total Rev</th>
                      <th className="p-2">GOP</th>
                      <th className="p-2">EBITDA</th>
                      <th className="p-2">FF&E</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calc.y1_mensual.map((m:any)=>(
                      <tr key={m.mes} className="border-t">
                        <td className="p-2 text-center">{m.mes}</td>
                        <td className="p-2 text-right">{m.total_rev.toFixed(0)}</td>
                        <td className="p-2 text-right">{m.gop.toFixed(0)}</td>
                        <td className="p-2 text-right">{m.ebitda.toFixed(0)}</td>
                        <td className="p-2 text-right">{m.ffe_amount.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}
	  
	  {accepted && calc && (
        <section>
          <h3 className="text-lg font-semibold mt-8 mb-2">Paso 3 — Supuestos de Proyección y Resultados</h3>
          <div className="grid grid-cols-4 gap-3">
            <label>Horizonte (años)
              <input className="input" type="number" min={1} max={40}
                value={ass.years} onChange={e=>setAss({...ass, years:Number(e.target.value)})}/>
            </label>
            <label>ADR crecimiento %
              <input className="input" type="number" step="0.01"
                value={ass.adr_growth_pct}
                onChange={e=>setAss({...ass, adr_growth_pct:Number(e.target.value)})}/>
            </label>
            <label>Δ Ocupación (pp/año)
              <input className="input" type="number" step="0.1"
                value={ass.occ_delta_pp}
                onChange={e=>setAss({...ass, occ_delta_pp:Number(e.target.value)})}/>
            </label>
            <label>Tope ocupación
              <input className="input" type="number" min={0} max={1} step="0.01"
                value={ass.occ_cap}
                onChange={e=>setAss({...ass, occ_cap:Number(e.target.value)})}/>
            </label>

            <label>Inflación costes dept. (%)
              <input className="input" type="number" step="0.01"
                value={ass.cost_inflation_pct}
                onChange={e=>setAss({...ass, cost_inflation_pct:Number(e.target.value)})}/>
            </label>
            <label>Inflación undistributed (%)
              <input className="input" type="number" step="0.01"
                value={ass.undistributed_inflation_pct}
                onChange={e=>setAss({...ass, undistributed_inflation_pct:Number(e.target.value)})}/>
            </label>
            <label>Inflación non-op (%)
              <input className="input" type="number" step="0.01"
                value={ass.nonop_inflation_pct}
                onChange={e=>setAss({...ass, nonop_inflation_pct:Number(e.target.value)})}/>
            </label>
            <label>Indexación fee base (% opcional)
              <input className="input" type="number" step="0.01"
                placeholder="usa contrato si vacío"
                value={ass.fees_indexation_pct ?? ''}
                onChange={e=>{
                  const v = e.target.value === '' ? null : Number(e.target.value);
                  setAss({...ass, fees_indexation_pct: (v as any)});
                }}/>
            </label>
          </div>

          <div className="flex gap-2 mt-3">
            <button className="px-3 py-2 bg-black text-white rounded" onClick={doProjection}>Proyectar 2..N</button>
            <button className="px-3 py-2 border rounded" onClick={doDebt}>Calcular deuda</button>
            <button className="px-3 py-2 border rounded" onClick={doValuation}>Valorar & Retornos</button>
          </div>

          {annuals && (
            <div className="mt-5">
              <h4 className="font-semibold">USALI Anual (1..N)</h4>
              <div className="overflow-auto">
                <table className="w-full text-sm border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2">Año</th>
                      <th className="p-2">Ingresos</th>
                      <th className="p-2">GOP</th>
                      <th className="p-2">EBITDA</th>
                      <th className="p-2">EBITDA-FF&E</th>
                      <th className="p-2">GOP %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {annuals.map((r:any)=>(
                      <tr key={r.anio} className="border-t">
                        <td className="p-2 text-center">{r.anio}</td>
                        <td className="p-2 text-right">{fmt(r.operating_revenue)}</td>
                        <td className="p-2 text-right">{fmt(r.gop)}</td>
                        <td className="p-2 text-right">{fmt(r.ebitda)}</td>
                        <td className="p-2 text-right">{fmt(r.ebitda_less_ffe)}</td>
                        <td className="p-2 text-right">{(r.gop_margin*100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {debt && (
            <div className="mt-5">
              <h4 className="font-semibold">Deuda</h4>
              <div className="text-sm mb-2">Principal inicial: {fmt(debt.loan_amount)}</div>
              <div className="overflow-auto">
                <table className="w-full text-sm border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2">Año</th>
                      <th className="p-2">Intereses</th>
                      <th className="p-2">Amortización</th>
                      <th className="p-2">Cuota</th>
                      <th className="p-2">Saldo final</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debt.schedule.map((d:any)=>(
                      <tr key={d.anio} className="border-t">
                        <td className="p-2 text-center">{d.anio}</td>
                        <td className="p-2 text-right">{fmt(d.intereses)}</td>
                        <td className="p-2 text-right">{fmt(d.amortizacion)}</td>
                        <td className="p-2 text-right">{fmt(d.cuota)}</td>
                        <td className="p-2 text-right">{fmt(d.saldo_final)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {vr && (
            <div className="mt-5">
              <h4 className="font-semibold">Valoración & Retornos</h4>
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Valor salida bruto" value={vr.valuation.valor_salida_bruto}/>
                <Stat label="Valor salida neto" value={vr.valuation.valor_salida_neto}/>
                <Stat label="Equity inicial" value={vr.returns.levered.equity0}/>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="p-3 border rounded">
                  <div className="font-semibold mb-1">Unlevered</div>
                  <div>IRR: {(vr.returns.unlevered.irr*100).toFixed(2)}%</div>
                  <div>MOIC: {vr.returns.unlevered.moic.toFixed(2)}x</div>
                </div>
                <div className="p-3 border rounded">
                  <div className="font-semibold mb-1">Levered</div>
                  <div>IRR: {(vr.returns.levered.irr*100).toFixed(2)}%</div>
                  <div>MOIC: {vr.returns.levered.moic.toFixed(2)}x</div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function fmt(n:number){ return Intl.NumberFormat('es-ES', { style:'currency', currency:'EUR' }).format(n ?? 0); }
function Stat({label, value}:{label:string; value:number}) {
  return (
    <div className="p-3 border rounded">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-semibold">{fmt(value ?? 0)}</div>
    </div>
  );
}
