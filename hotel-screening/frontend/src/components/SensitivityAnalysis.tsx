import React, { useState } from 'react';
import { api } from '../api';

// Funciones de formateo de números (formato español)
function fmtDecimal(n: number, decimals: number = 2) {
  return n.toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

interface SensitivityAnalysisProps {
  projectId: string;
  baseAssumptions: {
    years: number;
    adr_growth_pct: number;
    occ_delta_pp: number;
    occ_cap: number;
    cost_inflation_pct: number;
    undistributed_inflation_pct: number;
    nonop_inflation_pct: number;
    fees_indexation_pct: number | null;
  };
  baseIRR: number | null;
}

interface Scenario {
  id: string;
  name: string;
  adr_delta_pct: number;  // variación de ADR (ej. 0.02 = +2%)
  occ_delta_pp: number;   // variación de ocupación en pp (ej. -1.0 = -1pp)
}

interface SensitivityResult {
  scenario: Scenario;
  adr_growth_pct: number;
  occ_delta_pp: number;
  total_rev: number; // Suma de ingresos de todos los años
  dept_profit: number; // Suma de dept profit de todos los años
  gop: number; // Suma de GOP de todos los años
  ebitda: number; // Suma de EBITDA de todos los años
  irr_levered: number;
  irr_unlevered: number;
  delta_vs_base: number;
}

const DEFAULT_SCENARIOS: Scenario[] = [
  { id: '1', name: 'Pesimista', adr_delta_pct: -0.04, occ_delta_pp: -2.0 },
  { id: '2', name: 'Conservador', adr_delta_pct: -0.02, occ_delta_pp: -1.0 },
  { id: '3', name: 'Base', adr_delta_pct: 0, occ_delta_pp: 0 },
  { id: '4', name: 'Optimista', adr_delta_pct: 0.02, occ_delta_pp: 1.0 },
  { id: '5', name: 'Agresivo', adr_delta_pct: 0.04, occ_delta_pp: 2.0 },
];

export default function SensitivityAnalysis({ projectId, baseAssumptions, baseIRR }: SensitivityAnalysisProps) {
  const [results, setResults] = useState<SensitivityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>(DEFAULT_SCENARIOS);
  const [editMode, setEditMode] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [newScenarioADR, setNewScenarioADR] = useState(0);
  const [newScenarioOcc, setNewScenarioOcc] = useState(0);

  const loadDefaultScenarios = () => {
    setScenarios(DEFAULT_SCENARIOS);
    setEditMode(false);
  };

  const addScenario = () => {
    if (!newScenarioName.trim()) {
      alert('Debes proporcionar un nombre para el escenario');
      return;
    }
    const newScenario: Scenario = {
      id: Date.now().toString(),
      name: newScenarioName.trim(),
      adr_delta_pct: newScenarioADR / 100,
      occ_delta_pp: newScenarioOcc,
    };
    setScenarios([...scenarios, newScenario]);
    setNewScenarioName('');
    setNewScenarioADR(0);
    setNewScenarioOcc(0);
  };

  const removeScenario = (id: string) => {
    setScenarios(scenarios.filter(s => s.id !== id));
  };

  const runSensitivityAnalysis = async () => {
    if (scenarios.length === 0) {
      alert('Debes definir al menos un escenario');
      return;
    }

    setLoading(true);
    try {
      const sensitivityResults: SensitivityResult[] = [];

      for (const scenario of scenarios) {
        try {
          const modifiedAss = {
            ...baseAssumptions,
            adr_growth_pct: baseAssumptions.adr_growth_pct + scenario.adr_delta_pct,
            occ_delta_pp: baseAssumptions.occ_delta_pp + scenario.occ_delta_pp
          };

          // Ejecutar proyección con este escenario
          const projectionResult = await api(`/v1/projects/${projectId}/projection`, {
            method: 'POST',
            body: JSON.stringify(modifiedAss)
          });

          // Calcular totales de KPIs sumando todos los años
          const annuals = projectionResult.annuals || [];
          const total_rev = annuals.reduce((sum: number, a: any) => sum + (a.operating_revenue || 0), 0);
          const dept_profit = annuals.reduce((sum: number, a: any) => sum + (a.dept_profit || 0), 0);
          const gop = annuals.reduce((sum: number, a: any) => sum + (a.gop || 0), 0);
          const ebitda = annuals.reduce((sum: number, a: any) => sum + (a.ebitda || 0), 0);

          // Recalcular deuda
          await api(`/v1/projects/${projectId}/debt`, {
            method: 'POST',
            body: JSON.stringify({})
          });

          // Calcular retornos
          const vr = await api(`/v1/projects/${projectId}/valuation-and-returns`, {
            method: 'POST',
            body: JSON.stringify({})
          });

          sensitivityResults.push({
            scenario,
            adr_growth_pct: modifiedAss.adr_growth_pct,
            occ_delta_pp: modifiedAss.occ_delta_pp,
            total_rev,
            dept_profit,
            gop,
            ebitda,
            irr_levered: vr.returns.levered.irr,
            irr_unlevered: vr.returns.unlevered.irr,
            delta_vs_base: baseIRR ? (vr.returns.levered.irr - baseIRR) : 0
          });
        } catch (error) {
          console.error(`Error en escenario "${scenario.name}":`, error);
          // Continuar con el siguiente escenario en lugar de fallar todo
          continue;
        }
      }

      setResults(sensitivityResults);
      setShowAnalysis(true);

      // Restaurar escenario base
      await api(`/v1/projects/${projectId}/projection`, {
        method: 'POST',
        body: JSON.stringify(baseAssumptions)
      });
      await api(`/v1/projects/${projectId}/debt`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      await api(`/v1/projects/${projectId}/valuation-and-returns`, {
        method: 'POST',
        body: JSON.stringify({})
      });
    } catch (error) {
      console.error('Error ejecutando análisis de sensibilidad:', error);
      alert('Error al ejecutar el análisis de sensibilidad');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 p-4 border rounded-lg bg-gray-50">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h4 className="font-semibold text-lg">Análisis de Sensibilidad</h4>
          <p className="text-sm text-gray-600">Impacto de variaciones en ADR y Ocupación sobre IRR</p>
        </div>
        <div className="flex gap-2">
          <button
            className="px-3 py-2 bg-gray-600 text-white rounded text-sm disabled:bg-gray-400"
            onClick={() => setEditMode(!editMode)}
            disabled={loading}
          >
            {editMode ? 'Ver Escenarios' : 'Editar Escenarios'}
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
            onClick={runSensitivityAnalysis}
            disabled={loading || baseIRR === null || baseIRR === undefined || scenarios.length === 0}
          >
            {loading ? 'Calculando...' : 'Ejecutar análisis'}
          </button>
        </div>
      </div>

      {/* Modo de edición de escenarios */}
      {editMode && (
        <div className="mb-4 p-4 bg-white border rounded-lg">
          <div className="flex justify-between items-center mb-3">
            <h5 className="font-semibold">Configurar Escenarios</h5>
            <button
              className="px-3 py-1 bg-indigo-600 text-white text-sm rounded"
              onClick={loadDefaultScenarios}
            >
              Cargar escenarios predeterminados
            </button>
          </div>

          {/* Lista de escenarios actuales */}
          <div className="mb-4">
            <h6 className="text-sm font-medium mb-2">Escenarios actuales ({scenarios.length}):</h6>
            <div className="space-y-2">
              {scenarios.map((scenario) => (
                <div key={scenario.id} className="flex justify-between items-center p-2 bg-gray-50 rounded border">
                  <div className="flex-1">
                    <span className="font-medium">{scenario.name}</span>
                    <span className="text-sm text-gray-600 ml-3">
                      ADR: {scenario.adr_delta_pct >= 0 ? '+' : ''}{fmtDecimal(scenario.adr_delta_pct * 100, 1)}%
                    </span>
                    <span className="text-sm text-gray-600 ml-2">
                      Ocupación: {scenario.occ_delta_pp >= 0 ? '+' : ''}{fmtDecimal(scenario.occ_delta_pp, 1)}pp
                    </span>
                  </div>
                  <button
                    className="px-2 py-1 bg-red-500 text-white text-xs rounded"
                    onClick={() => removeScenario(scenario.id)}
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Formulario para agregar nuevo escenario */}
          <div className="p-3 bg-blue-50 rounded border border-blue-200">
            <h6 className="text-sm font-medium mb-3">Agregar nuevo escenario:</h6>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Nombre del escenario</label>
                <input
                  type="text"
                  className="w-full px-2 py-1 border rounded text-sm"
                  placeholder="Ej: Crisis económica"
                  value={newScenarioName}
                  onChange={(e) => setNewScenarioName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Variación ADR (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full px-2 py-1 border rounded text-sm"
                  placeholder="Ej: 2.0"
                  value={newScenarioADR}
                  onChange={(e) => setNewScenarioADR(parseFloat(e.target.value) || 0)}
                />
                <p className="text-xs text-gray-500 mt-1">Ej: 2 para +2%, -3 para -3%</p>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Variación Ocupación (pp)</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full px-2 py-1 border rounded text-sm"
                  placeholder="Ej: -1.0"
                  value={newScenarioOcc}
                  onChange={(e) => setNewScenarioOcc(parseFloat(e.target.value) || 0)}
                />
                <p className="text-xs text-gray-500 mt-1">Ej: 1 para +1pp, -2 para -2pp</p>
              </div>
              <div className="flex items-end">
                <button
                  className="w-full px-3 py-1 bg-green-600 text-white rounded text-sm"
                  onClick={addScenario}
                >
                  Agregar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAnalysis && results.length > 0 && (
        <div className="mt-4">
          <div className="overflow-auto">
            <table className="w-full text-sm border bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 border text-left">Escenario</th>
                  <th className="p-3 border text-right bg-blue-50">Total Rev</th>
                  <th className="p-3 border text-right bg-yellow-50">Dept Profit</th>
                  <th className="p-3 border text-right bg-green-50">GOP</th>
                  <th className="p-3 border text-right bg-purple-50">EBITDA</th>
                  <th className="p-3 border text-center">ADR Growth</th>
                  <th className="p-3 border text-center">Ocupación Δ</th>
                  <th className="p-3 border text-right">IRR Levered</th>
                  <th className="p-3 border text-right">IRR Unlevered</th>
                  <th className="p-3 border text-right">Δ vs Base</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, idx) => {
                  const isBase = Math.abs(r.adr_growth_pct - baseAssumptions.adr_growth_pct) < 0.001 &&
                                 Math.abs(r.occ_delta_pp - baseAssumptions.occ_delta_pp) < 0.001;
                  const rowClass = isBase ? 'bg-blue-50 font-semibold' : '';

                  return (
                    <tr key={idx} className={`border-t ${rowClass}`}>
                      <td className="p-3 border">
                        {r.scenario.name}
                      </td>
                      <td className="p-3 border text-right bg-blue-50">
                        {fmt(r.total_rev)}
                      </td>
                      <td className="p-3 border text-right bg-yellow-50">
                        {fmt(r.dept_profit)}
                      </td>
                      <td className="p-3 border text-right bg-green-50">
                        {fmt(r.gop)}
                      </td>
                      <td className="p-3 border text-right bg-purple-50">
                        {fmt(r.ebitda)}
                      </td>
                      <td className="p-3 border text-center">
                        {fmtDecimal(r.adr_growth_pct * 100, 2)}%
                      </td>
                      <td className="p-3 border text-center">
                        {r.occ_delta_pp >= 0 ? '+' : ''}{fmtDecimal(r.occ_delta_pp, 2)}pp
                      </td>
                      <td className="p-3 border text-right">
                        {fmtDecimal(r.irr_levered * 100, 2)}%
                      </td>
                      <td className="p-3 border text-right">
                        {fmtDecimal(r.irr_unlevered * 100, 2)}%
                      </td>
                      <td className={`p-3 border text-right ${getDeltaColorClass(r.delta_vs_base)}`}>
                        {r.delta_vs_base >= 0 ? '+' : ''}{fmtDecimal(r.delta_vs_base * 100, 2)}pp
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Visualización gráfica simple */}
          <div className="mt-4">
            <h5 className="font-medium mb-2">Sensibilidad del IRR Levered</h5>
            <div className="space-y-2">
              {results.map((r, idx) => {
                const isBase = Math.abs(r.adr_growth_pct - baseAssumptions.adr_growth_pct) < 0.001 &&
                               Math.abs(r.occ_delta_pp - baseAssumptions.occ_delta_pp) < 0.001;
                const barWidth = Math.max(5, (r.irr_levered * 100) * 4); // Escala visual

                return (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-32 text-xs text-right truncate" title={r.scenario.name}>
                      {r.scenario.name}
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                      <div
                        className={`h-6 rounded-full flex items-center justify-end pr-2 text-xs text-white ${
                          isBase ? 'bg-blue-600' : 'bg-gray-500'
                        }`}
                        style={{ width: `${barWidth}%` }}
                      >
                        {fmtDecimal(r.irr_levered * 100, 2)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Resumen de insights */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
            <strong>Insights:</strong>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>
                Rango de IRR levered: {fmtDecimal(Math.min(...results.map(r => r.irr_levered)) * 100, 2)}% - {fmtDecimal(Math.max(...results.map(r => r.irr_levered)) * 100, 2)}%
              </li>
              <li>
                Volatilidad máxima del IRR: ±{fmtDecimal(Math.max(...results.map(r => Math.abs(r.delta_vs_base))) * 100, 2)}pp
              </li>
              <li>
                Escenarios analizados: {results.length} (combinando variaciones de ADR y Ocupación)
              </li>
            </ul>
          </div>
        </div>
      )}

      {(baseIRR === null || baseIRR === undefined) && (
        <div className="mt-3 text-sm text-gray-500 italic">
          Debes calcular primero la proyección, deuda y retornos base antes de ejecutar el análisis de sensibilidad.
        </div>
      )}
    </div>
  );
}

function getDeltaColorClass(delta: number): string {
  if (delta > 0.01) return 'text-green-700 font-semibold';
  if (delta < -0.01) return 'text-red-700 font-semibold';
  return 'text-gray-700';
}

function fmt(n: number) {
  const rounded = Math.round(n ?? 0);
  const str = Math.abs(rounded).toString();
  const parts = [];
  for (let i = str.length; i > 0; i -= 3) {
    const start = Math.max(0, i - 3);
    parts.unshift(str.substring(start, i));
  }
  const formatted = parts.join('.');
  return rounded < 0 ? '-' + formatted : formatted;
}
