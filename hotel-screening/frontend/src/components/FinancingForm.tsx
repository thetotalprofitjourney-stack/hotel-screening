import React from 'react';
import NumericInput from './NumericInput';

export interface FinancingConfig {
  precio_compra: number;
  capex_inicial: number;
  coste_tx_compra_pct: number | null;
  ltv: number;
  interes: number;
  plazo_anios: number;
  tipo_amortizacion: 'frances' | 'bullet';
}

interface FinancingFormProps {
  data: FinancingConfig;
  onChange: (data: FinancingConfig) => void;
  onSubmit: () => void;
  showSubmitButton?: boolean;
}

export default function FinancingForm({ data, onChange, onSubmit, showSubmitButton = true }: FinancingFormProps) {
  function updateField<K extends keyof FinancingConfig>(field: K, value: FinancingConfig[K]) {
    onChange({ ...data, [field]: value });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <section className="border rounded-lg p-3">
        <h3 className="text-base font-semibold mb-2">Financiación</h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Precio de compra (€) *</span>
            <input
              required
              className="border px-3 py-2 rounded"
              type="number"
              step="any"
              value={data.precio_compra}
              onChange={e => updateField('precio_compra', Number(e.target.value))}
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">CAPEX inicial (€) *</span>
            <input
              required
              className="border px-3 py-2 rounded"
              type="number"
              step="any"
              value={data.capex_inicial}
              onChange={e => updateField('capex_inicial', Number(e.target.value))}
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Coste transacción compra %</span>
            <NumericInput
              className="border px-3 py-2 rounded"
              value={data.coste_tx_compra_pct !== null ? data.coste_tx_compra_pct * 100 : ''}
              onChange={val => updateField('coste_tx_compra_pct', val === 0 && !data.coste_tx_compra_pct ? null : val / 100)}
              decimals={2}
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">LTV % *</span>
            <NumericInput
              required
              className="border px-3 py-2 rounded"
              value={data.ltv * 100}
              onChange={val => updateField('ltv', val / 100)}
              decimals={2}
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Tasa de interés % *</span>
            <NumericInput
              required
              className="border px-3 py-2 rounded"
              value={data.interes * 100}
              onChange={val => updateField('interes', val / 100)}
              decimals={2}
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Plazo (años) *</span>
            <input
              required
              className="border px-3 py-2 rounded"
              type="number"
              step="any"
              value={data.plazo_anios}
              onChange={e => updateField('plazo_anios', Number(e.target.value))}
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Tipo de amortización *</span>
            <select
              required
              className="border px-3 py-2 rounded"
              value={data.tipo_amortizacion}
              onChange={e => updateField('tipo_amortizacion', e.target.value as FinancingConfig['tipo_amortizacion'])}
            >
              <option value="frances">Francés</option>
              <option value="bullet">Bullet</option>
            </select>
          </label>
        </div>
      </section>

      {showSubmitButton && (
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2 bg-black text-white rounded hover:bg-gray-800"
          >
            Calcular Deuda
          </button>
        </div>
      )}
    </form>
  );
}
