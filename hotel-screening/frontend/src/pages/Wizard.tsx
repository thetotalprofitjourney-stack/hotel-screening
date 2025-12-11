import React, { useEffect, useState } from 'react';
import { api } from '../api';
import MonthlyTable from '../components/MonthlyTable';
import ProjectConfigForm, { ProjectConfig } from '../components/ProjectConfigForm';
import UsaliEditor from '../components/UsaliEditor';
import SensitivityAnalysis from '../components/SensitivityAnalysis';
import AnnualUsaliTable from '../components/AnnualUsaliTable';

export default function Wizard({ projectId, onBack }:{ projectId:string; onBack:()=>void }) {
  const [config, setConfig] = useState<ProjectConfig | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [projectState, setProjectState] = useState<string>('draft');

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
  const [loading, setLoading] = useState({
    projection: false,
    debt: false,
    valuation: false
  });

  async function loadConfig() {
    try {
      const data = await api(`/v1/projects/${projectId}/config`);
      setConfig(data);
      setConfigLoaded(true);
      // Sincronizar years con horizonte del proyecto
      if (data.horizonte) {
        setAss(prev => ({ ...prev, years: data.horizonte }));
      }
      // Verificar si la configuración está completa (al menos nombre y precio_compra)
      if (!data.nombre || data.precio_compra === null || data.precio_compra === undefined) {
        setShowConfigForm(true);
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
      setShowConfigForm(true);
    }
  }

  async function loadProjectState() {
    try {
      const data = await api(`/v1/projects`);
      const project = data.find((p: any) => p.project_id === projectId);
      if (project && project.estado) {
        setProjectState(project.estado);
        // Inicializar estados según el estado del proyecto
        if (project.estado === 'y1_commercial' || project.estado === 'y1_usali' || project.estado === 'projection_2n' || project.estado === 'finalized') {
          setAccepted(true);
        }
        if (project.estado === 'y1_usali' || project.estado === 'projection_2n' || project.estado === 'finalized') {
          // Cargar datos de USALI
          calcY1();
        }
      }
    } catch (error) {
      console.error('Error cargando estado del proyecto:', error);
    }
  }

  async function saveConfig(newConfig: ProjectConfig) {
    try {
      await api(`/v1/projects/${projectId}/config`, {
        method: 'PUT',
        body: JSON.stringify(newConfig)
      });
      setConfig(newConfig);
      setShowConfigForm(false);
    } catch (error) {
      console.error('Error guardando configuración:', error);
      alert('Error al guardar la configuración');
    }
  }

  async function loadBenchmark() {
    // Primero verificar si ya existen datos guardados en y1_commercial
    try {
      const y1Data = await api(`/v1/projects/${projectId}/y1/commercial`);
      if (y1Data && y1Data.meses && y1Data.meses.length === 12) {
        // Si hay datos guardados, mostrar esos
        setMeses(y1Data.meses);
        return;
      }
    } catch (error) {
      // Si no hay datos guardados, continuar con el benchmark
      console.log('No hay datos de Y1 comercial guardados, cargando benchmark');
    }

    // Cargar benchmark si no hay datos guardados
    const data = await api(`/v1/projects/${projectId}/y1/benchmark?anio_base=${anio}`);
    setMeses(data.meses);
  }

  useEffect(() => {
    loadConfig().catch(console.error);
    loadProjectState().catch(console.error);
  }, [projectId]);

  useEffect(()=>{
    if (configLoaded) {
      loadBenchmark().catch(console.error);
    }
  },[anio, projectId, configLoaded]);

  async function accept() {
    await api(`/v1/projects/${projectId}/y1/benchmark/accept`, {
      method:'POST',
      body: JSON.stringify({ anio_base: anio, meses: meses.map((m:any)=>({ mes:m.mes, occ:m.occ, adr:m.adr })) })
    });
    setAccepted(true);
  }

  async function calcY1() {
    // Primero intentar cargar datos guardados
    try {
      const r = await api(`/v1/projects/${projectId}/y1/usali`);
      setCalc(r);
      return;
    } catch (error) {
      // Si no hay datos guardados, calcular con ratios de mercado
      console.log('No hay USALI guardado, calculando con ratios de mercado');
    }

    // Calcular con ratios de mercado si no hay datos guardados
    const r = await api(`/v1/projects/${projectId}/y1/calc`, { method:'POST', body: JSON.stringify({}) });
    setCalc(r);
  }

  async function saveUsali(editedData: any[]) {
    await api(`/v1/projects/${projectId}/y1/usali`, {
      method: 'PUT',
      body: JSON.stringify({ monthly: editedData })
    });
    // Recargar los datos después de guardar (ahora cargará los datos guardados, no recalculará)
    await calcY1();
  }

  async function doProjection() {
    if (loading.projection) return;
    setLoading(prev => ({ ...prev, projection: true }));
    try {
      const r = await api(`/v1/projects/${projectId}/projection`, { method:'POST', body: JSON.stringify(ass) });
      setAnnuals(r.annuals);
    } catch (error) {
      console.error('Error en proyección:', error);
      alert('Error al proyectar: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setLoading(prev => ({ ...prev, projection: false }));
    }
  }

  async function doDebt() {
    if (loading.debt) return;
    setLoading(prev => ({ ...prev, debt: true }));
    try {
      const r = await api(`/v1/projects/${projectId}/debt`, { method:'POST', body: JSON.stringify({}) });
      setDebt(r);
    } catch (error) {
      console.error('Error en cálculo de deuda:', error);
      alert('Error al calcular deuda: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setLoading(prev => ({ ...prev, debt: false }));
    }
  }

  async function doValuation() {
    if (loading.valuation) return;
    setLoading(prev => ({ ...prev, valuation: true }));
    try {
      const r = await api(`/v1/projects/${projectId}/valuation-and-returns`, { method:'POST', body: JSON.stringify({}) });
      setVR(r);
    } catch (error) {
      console.error('Error en valoración:', error);
      alert('Error al valorar: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setLoading(prev => ({ ...prev, valuation: false }));
    }
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

      {/* Paso 0: Configuración del proyecto */}
      <section>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">Paso 0 — Configuración del Proyecto</h3>
          {config && !showConfigForm && (
            <button
              className="px-3 py-1 border rounded text-sm hover:bg-gray-50"
              onClick={() => setShowConfigForm(true)}
            >
              Editar configuración
            </button>
          )}
        </div>

        {showConfigForm ? (
          <ProjectConfigForm
            initialData={config || undefined}
            onSubmit={saveConfig}
            onCancel={config ? () => setShowConfigForm(false) : undefined}
          />
        ) : config ? (
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Proyecto:</span> {config.nombre}
              </div>
              <div>
                <span className="font-medium">Ubicación:</span> {config.comunidad_autonoma} - {config.provincia} - {config.zona}
              </div>
              <div>
                <span className="font-medium">Habitaciones:</span> {config.habitaciones}
              </div>
              <div>
                <span className="font-medium">Precio compra:</span> {fmt(config.precio_compra || 0)}
              </div>
              <div>
                <span className="font-medium">CAPEX:</span> {fmt(config.capex_inicial || 0)}
              </div>
              <div>
                <span className="font-medium">Horizonte:</span> {config.horizonte} años
              </div>
            </div>
          </div>
        ) : (
          <div className="border rounded-lg p-4 bg-yellow-50 text-sm">
            Cargando configuración...
          </div>
        )}
      </section>

      {!showConfigForm && config && (
        <>
      <section>
        <h3 className="text-lg font-semibold mb-2">Paso 1 — Validación comercial Y1</h3>
        <MonthlyTable rows={meses} onChange={setMeses} habitaciones={config?.habitaciones || 0} />
        <button className="mt-3 px-3 py-2 bg-black text-white rounded" onClick={accept}>Aceptar Y1 comercial</button>
      </section>

      {accepted && (
        <section>
          <h3 className="text-lg font-semibold mb-2">Paso 2 — Cálculo USALI Y1</h3>
          {!calc ? (
            <button className="px-3 py-2 bg-black text-white rounded" onClick={calcY1}>
              Calcular USALI con ratios de mercado
            </button>
          ) : (
            <UsaliEditor calculatedData={calc.y1_mensual} onSave={saveUsali} />
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
              <input className="input" type="number" step="0.1"
                value={(ass.adr_growth_pct * 100).toFixed(1)}
                onChange={e=>setAss({...ass, adr_growth_pct:Number(e.target.value) / 100})}
                onFocus={e => e.target.select()}/>
            </label>
            <label>Δ Ocupación (pp/año)
              <input className="input" type="number" step="0.1"
                value={ass.occ_delta_pp}
                onChange={e=>setAss({...ass, occ_delta_pp:Number(e.target.value)})}
                onFocus={e => e.target.select()}/>
            </label>
            <label>Tope ocupación %
              <input className="input" type="number" min={0} max={100} step="0.1"
                value={(ass.occ_cap * 100).toFixed(1)}
                onChange={e=>setAss({...ass, occ_cap:Number(e.target.value) / 100})}
                onFocus={e => e.target.select()}/>
            </label>

            <label>Inflación costes dept. (%)
              <input className="input" type="number" step="0.1"
                value={(ass.cost_inflation_pct * 100).toFixed(1)}
                onChange={e=>setAss({...ass, cost_inflation_pct:Number(e.target.value) / 100})}
                onFocus={e => e.target.select()}/>
            </label>
            <label>Inflación undistributed (%)
              <input className="input" type="number" step="0.1"
                value={(ass.undistributed_inflation_pct * 100).toFixed(1)}
                onChange={e=>setAss({...ass, undistributed_inflation_pct:Number(e.target.value) / 100})}
                onFocus={e => e.target.select()}/>
            </label>
            <label>Inflación non-op (%)
              <input className="input" type="number" step="0.1"
                value={(ass.nonop_inflation_pct * 100).toFixed(1)}
                onChange={e=>setAss({...ass, nonop_inflation_pct:Number(e.target.value) / 100})}
                onFocus={e => e.target.select()}/>
            </label>
            <label>Indexación fee base (% opcional)
              <input className="input" type="number" step="0.1"
                placeholder="usa contrato si vacío"
                value={ass.fees_indexation_pct !== null ? (ass.fees_indexation_pct * 100).toFixed(1) : ''}
                onChange={e=>{
                  const v = e.target.value === '' ? null : Number(e.target.value) / 100;
                  setAss({...ass, fees_indexation_pct: v});
                }}
                onFocus={e => e.target.select()}/>
            </label>
          </div>

          <div className="flex gap-2 mt-3">
            <button
              className="px-3 py-2 bg-black text-white rounded disabled:bg-gray-400"
              onClick={doProjection}
              disabled={loading.projection}
            >
              {loading.projection ? 'Proyectando...' : 'Proyectar 2..N'}
            </button>
            <button
              className="px-3 py-2 border rounded disabled:bg-gray-200"
              onClick={doDebt}
              disabled={loading.debt || !annuals}
            >
              {loading.debt ? 'Calculando...' : 'Calcular deuda'}
            </button>
            <button
              className="px-3 py-2 border rounded disabled:bg-gray-200"
              onClick={doValuation}
              disabled={loading.valuation || !debt}
            >
              {loading.valuation ? 'Valorando...' : 'Valorar & Retornos'}
            </button>
          </div>

          {annuals && <AnnualUsaliTable data={annuals} />}

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
            <>
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

              <SensitivityAnalysis
                projectId={projectId}
                baseAssumptions={ass}
                baseIRR={vr.returns.levered.irr}
              />
            </>
          )}
        </section>
      )}
        </>
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
