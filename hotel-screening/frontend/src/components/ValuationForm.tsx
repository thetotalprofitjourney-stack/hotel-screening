import React from 'react';
import NumericInput from './NumericInput';

export interface ValuationConfig {
  metodo_valoracion: 'cap_rate' | 'multiplo';
  cap_rate_salida: number | null;
  multiplo_salida: number | null;
  coste_tx_venta_pct: number;
}

interface ValuationFormProps {
  data: ValuationConfig;
  onChange: (data: ValuationConfig) => void;
  onSubmit: () => void;
}

export default function ValuationForm({ data, onChange, onSubmit }: ValuationFormProps) {
  function updateField<K extends keyof ValuationConfig>(field: K, value: ValuationConfig[K]) {
    onChange({ ...data, [field]: value });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <section className="border rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Valoración</h3>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Método de valoración *</span>
            <select
              required
              className="border px-3 py-2 rounded"
              value={data.metodo_valoracion}
              onChange={e => updateField('metodo_valoracion', e.target.value as ValuationConfig['metodo_valoracion'])}
            >
              <option value="cap_rate">Cap Rate</option>
              <option value="multiplo">Múltiplo</option>
            </select>
          </label>

          {data.metodo_valoracion === 'cap_rate' && (
            <label className="flex flex-col">
              <span className="text-sm font-medium mb-1">Cap rate salida % *</span>
              <NumericInput
                className="border px-3 py-2 rounded"
                required
                value={data.cap_rate_salida !== null ? data.cap_rate_salida * 100 : ''}
                onChange={val => updateField('cap_rate_salida', val === 0 && !data.cap_rate_salida ? null : val / 100)}
                decimals={2}
              />
            </label>
          )}

          {data.metodo_valoracion === 'multiplo' && (
            <label className="flex flex-col">
              <span className="text-sm font-medium mb-1">Múltiplo salida *</span>
              <input
                className="border px-3 py-2 rounded"
                type="number"
                step="any"
                required
                value={data.multiplo_salida ?? ''}
                onChange={e => updateField('multiplo_salida', e.target.value ? Number(e.target.value) : null)}
              />
            </label>
          )}

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Coste transacción venta % *</span>
            <NumericInput
              required
              className="border px-3 py-2 rounded"
              value={data.coste_tx_venta_pct * 100}
              onChange={val => updateField('coste_tx_venta_pct', val / 100)}
              decimals={2}
            />
          </label>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          className="px-6 py-2 bg-black text-white rounded hover:bg-gray-800"
        >
          Calcular Valoración y Retornos
        </button>
      </div>
    </form>
  );
}
