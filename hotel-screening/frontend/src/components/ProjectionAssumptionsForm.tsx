import React from 'react';
import NumericInput from './NumericInput';

export interface ProjectionAssumptions {
  horizonte: number;
  adr_growth_pct: number;
  occ_delta_pp: number;
  occ_cap: number;
  cost_inflation_pct: number;
  undistributed_inflation_pct: number;
  nonop_inflation_pct: number;
}

interface ProjectionAssumptionsFormProps {
  data: ProjectionAssumptions;
  onChange: (data: ProjectionAssumptions) => void;
  onSubmit: () => void;
  showSubmitButton?: boolean;
}

export default function ProjectionAssumptionsForm({ data, onChange, onSubmit, showSubmitButton = true }: ProjectionAssumptionsFormProps) {
  function updateField<K extends keyof ProjectionAssumptions>(field: K, value: ProjectionAssumptions[K]) {
    onChange({ ...data, [field]: value });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <section className="border rounded-lg p-3">
        <h3 className="text-base font-semibold mb-2">Supuestos de Proyección</h3>
        <div className="grid grid-cols-4 gap-3">
          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Horizonte (años) *</span>
            <input
              required
              className="border px-3 py-2 rounded"
              type="number"
              min={1}
              max={40}
              value={data.horizonte}
              onChange={e => updateField('horizonte', Number(e.target.value))}
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">ADR crecimiento % *</span>
            <NumericInput
              required
              className="border px-3 py-2 rounded"
              value={data.adr_growth_pct * 100}
              onChange={val => updateField('adr_growth_pct', val / 100)}
              decimals={2}
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Δ Ocupación % *</span>
            <NumericInput
              required
              className="border px-3 py-2 rounded"
              value={data.occ_delta_pp}
              onChange={val => updateField('occ_delta_pp', val)}
              decimals={2}
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Tope ocupación % *</span>
            <NumericInput
              required
              className="border px-3 py-2 rounded"
              value={data.occ_cap * 100}
              onChange={val => updateField('occ_cap', val / 100)}
              decimals={2}
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Inflación costes dept. (%) *</span>
            <NumericInput
              required
              className="border px-3 py-2 rounded"
              value={data.cost_inflation_pct * 100}
              onChange={val => updateField('cost_inflation_pct', val / 100)}
              decimals={2}
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Inflación undistributed (%) *</span>
            <NumericInput
              required
              className="border px-3 py-2 rounded"
              value={data.undistributed_inflation_pct * 100}
              onChange={val => updateField('undistributed_inflation_pct', val / 100)}
              decimals={2}
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Inflación non-op (%) *</span>
            <NumericInput
              required
              className="border px-3 py-2 rounded"
              value={data.nonop_inflation_pct * 100}
              onChange={val => updateField('nonop_inflation_pct', val / 100)}
              decimals={2}
            />
          </label>
        </div>
      </section>

      {showSubmitButton && (
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2 bg-black text-white rounded hover:bg-gray-800"
          >
            Proyectar años 2..N
          </button>
        </div>
      )}
    </form>
  );
}
