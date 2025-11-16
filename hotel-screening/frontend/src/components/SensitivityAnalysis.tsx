import React, { useState } from 'react';
import { api } from '../api';

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
  adr_delta_pct: number;
  occ_delta_pp: number;
}

interface SensitivityResult {
  scenario: Scenario;
  adr_growth_pct: number;
  occ_delta_pp: number;
  total_revenue: number;
  gop: number;
  ebitda: number;
  irr_levered: number;
  irr_unlevered: number;
  delta_vs_base: number;
}

const SCENARIOS: Scenario[] = [
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

  const runSensitivityAnalysis = async () => {
    setLoading(true);
    try {
      const sensitivityResults: SensitivityResult[] = [];

      for (const scenario of SCENARIOS) {
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

        // Obtener datos del último año proyectado
        const annuals = projectionResult.annuals || [];
        const lastYear = annuals[annuals.length - 1] || {};

        sensitivityResults.push({
          scenario,
          adr_growth_pct: modifiedAss.adr_growth_pct,
          occ_delta_pp: modifiedAss.occ_delta_pp,
          total_revenue: lastYear.operating_revenue || 0,
          gop: lastYear.gop || 0,
          ebitda: lastYear.ebitda || 0,
          irr_levered: vr.returns.levered.irr,
          irr_unlevered: vr.returns.unlevered.irr,
          delta_vs_base: baseIRR ? (vr.returns.levered.irr - baseIRR) : 0
        });
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
          <p className="text-sm text-gray-600">
            Evaluación automática de 5 escenarios combinando variaciones de ADR y Ocupación
          </p>
        </div>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
          onClick={runSensitivityAnalysis}
          disabled={loading || !baseIRR}
        >
          {loading ? 'Calculando...' : 'Ejecutar análisis'}
        </button>
      </div>

      {showAnalysis && results.length > 0 && (
        <div className="mt-4">
          <div className="overflow-auto">
            <table className="w-full text-sm border bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 border text-left">Escenario</th>
                  <th className="p-3 border text-center">ADR Growth</th>
                  <th className="p-3 border text-center">Ocupación Δ</th>
                  <th className="p-3 border text-right">Total Revenue (Año N)</th>
                  <th className="p-3 border text-right">GOP (Año N)</th>
                  <th className="p-3 border text-right">EBITDA (Año N)</th>
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
                      <td className="p-3 border text-center">
                        {(r.adr_growth_pct * 100).toFixed(2)}%
                      </td>
                      <td className="p-3 border text-center">
                        {r.occ_delta_pp >= 0 ? '+' : ''}{r.occ_delta_pp.toFixed(2)}pp
                      </td>
                      <td className="p-3 border text-right">
                        {r.total_revenue.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €
                      </td>
                      <td className="p-3 border text-right">
                        {r.gop.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €
                      </td>
                      <td className="p-3 border text-right">
                        {r.ebitda.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €
                      </td>
                      <td className="p-3 border text-right">
                        {(r.irr_levered * 100).toFixed(2)}%
                      </td>
                      <td className="p-3 border text-right">
                        {(r.irr_unlevered * 100).toFixed(2)}%
                      </td>
                      <td className={`p-3 border text-right ${getDeltaColorClass(r.delta_vs_base)}`}>
                        {r.delta_vs_base >= 0 ? '+' : ''}{(r.delta_vs_base * 100).toFixed(2)}pp
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
                        {(r.irr_levered * 100).toFixed(2)}%
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
                Rango de IRR levered: {(Math.min(...results.map(r => r.irr_levered)) * 100).toFixed(2)}% - {(Math.max(...results.map(r => r.irr_levered)) * 100).toFixed(2)}%
              </li>
              <li>
                Volatilidad máxima del IRR: ±{(Math.max(...results.map(r => Math.abs(r.delta_vs_base))) * 100).toFixed(2)}pp
              </li>
              <li>
                Rango de EBITDA (Año N): {Math.min(...results.map(r => r.ebitda)).toLocaleString('es-ES', { maximumFractionDigits: 0 })} € - {Math.max(...results.map(r => r.ebitda)).toLocaleString('es-ES', { maximumFractionDigits: 0 })} €
              </li>
            </ul>
          </div>
        </div>
      )}

      {!baseIRR && (
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
