import React from 'react';
import NumericInput from './NumericInput';

export interface OperationConfig {
  // Operator contract
  operacion_tipo: 'gestion_propia' | 'operador';
  fee_base_anual: number | null;
  fee_pct_total_rev: number | null;
  fee_pct_gop: number | null;
  fee_incentive_pct: number | null;
  fee_hurdle_gop_margin: number | null;
  gop_ajustado: boolean;

  // Settings
  ffe: number;

  // Non-operating
  nonop_taxes_anual: number;
  nonop_insurance_anual: number;
  nonop_rent_anual: number;
  nonop_other_anual: number;
}

interface OperationConfigFormProps {
  data: OperationConfig;
  onChange: (data: OperationConfig) => void;
  onSubmit: () => void;
  showSubmitButton?: boolean;
}

export default function OperationConfigForm({ data, onChange, onSubmit, showSubmitButton = true }: OperationConfigFormProps) {
  function updateField<K extends keyof OperationConfig>(field: K, value: OperationConfig[K]) {
    onChange({ ...data, [field]: value });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Sección: Contrato Operador */}
      <section className="border rounded-lg p-3">
        <h3 className="text-base font-semibold mb-2">Contrato Operador</h3>

        {/* FILA 1: Tipo de operación, Fee base anual, Fee % sobre TOTAL REV */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Tipo de operación *</span>
            <select
              required
              className="border px-3 py-2 rounded"
              value={data.operacion_tipo}
              onChange={e => updateField('operacion_tipo', e.target.value as OperationConfig['operacion_tipo'])}
            >
              <option value="gestion_propia">Gestión propia</option>
              <option value="operador">Operador externo</option>
            </select>
          </label>

          {data.operacion_tipo === 'operador' && (
            <>
              <label className="flex flex-col">
                <span className="text-sm font-medium mb-1">Fee base anual (€)</span>
                <input
                  className="border px-3 py-2 rounded"
                  type="number"
                  step="any"
                  value={data.fee_base_anual ?? ''}
                  onChange={e => updateField('fee_base_anual', e.target.value ? Number(e.target.value) : null)}
                />
              </label>

              <label className="flex flex-col">
                <span className="text-sm font-medium mb-1">Fee % sobre TOTAL REV</span>
                <NumericInput
                  className="border px-3 py-2 rounded"
                  value={data.fee_pct_total_rev !== null ? data.fee_pct_total_rev * 100 : ''}
                  onChange={val => updateField('fee_pct_total_rev', val === 0 && !data.fee_pct_total_rev ? null : val / 100)}
                  decimals={2}
                />
              </label>
            </>
          )}
        </div>

        {/* FILA 2: Tipo de GOP para cálculo de fees, FF&E */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          {data.operacion_tipo === 'operador' && (
            <label className="flex flex-col">
              <span className="text-sm font-medium mb-1">Tipo de GOP para cálculo de fees</span>
              <select
                className="border px-3 py-2 rounded"
                value={data.gop_ajustado ? 'ajustado' : 'standard'}
                onChange={e => updateField('gop_ajustado', e.target.value === 'ajustado')}
              >
                <option value="standard">GOP (sin descontar FF&E)</option>
                <option value="ajustado">GOP Ajustado (descontando FF&E)</option>
              </select>
              <span className="text-xs text-gray-500 mt-1">
                Afecta al cálculo del Fee % sobre GOP y Fee incentivo %.
              </span>
            </label>
          )}

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">FF&E (% sobre ingresos) *</span>
            <NumericInput
              required
              className="border px-3 py-2 rounded"
              value={data.ffe * 100}
              onChange={val => updateField('ffe', val / 100)}
              decimals={2}
            />
          </label>
        </div>

        {/* FILA 3: Fee % sobre GOP, Hurdle GOP margin %, Fee incentivo % */}
        {data.operacion_tipo === 'operador' && (
          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col">
              <span className="text-sm font-medium mb-1">Fee % sobre GOP</span>
              <NumericInput
                className="border px-3 py-2 rounded"
                value={data.fee_pct_gop !== null ? data.fee_pct_gop * 100 : ''}
                onChange={val => updateField('fee_pct_gop', val === 0 && !data.fee_pct_gop ? null : val / 100)}
                decimals={2}
              />
            </label>

            <label className="flex flex-col">
              <span className="text-sm font-medium mb-1">Hurdle GOP margin %</span>
              <NumericInput
                className="border px-3 py-2 rounded"
                value={data.fee_hurdle_gop_margin !== null ? data.fee_hurdle_gop_margin * 100 : ''}
                onChange={val => updateField('fee_hurdle_gop_margin', val === 0 && !data.fee_hurdle_gop_margin ? null : val / 100)}
                decimals={2}
              />
            </label>

            <label className="flex flex-col">
              <span className="text-sm font-medium mb-1">Fee incentivo %</span>
              <NumericInput
                className="border px-3 py-2 rounded"
                value={data.fee_incentive_pct !== null ? data.fee_incentive_pct * 100 : ''}
                onChange={val => updateField('fee_incentive_pct', val === 0 && !data.fee_incentive_pct ? null : val / 100)}
                decimals={2}
              />
            </label>
          </div>
        )}
      </section>

      {/* Sección: Non-Operating */}
      <section className="border rounded-lg p-3">
        <h3 className="text-base font-semibold mb-2">Gastos Non-Operating (anual)</h3>
        <div className="grid grid-cols-4 gap-3">
          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Tributos (€) *</span>
            <input
              required
              className="border px-3 py-2 rounded"
              type="number"
              step="any"
              value={data.nonop_taxes_anual}
              onChange={e => updateField('nonop_taxes_anual', Number(e.target.value))}
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Seguros (€) *</span>
            <input
              required
              className="border px-3 py-2 rounded"
              type="number"
              step="any"
              value={data.nonop_insurance_anual}
              onChange={e => updateField('nonop_insurance_anual', Number(e.target.value))}
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Renta/Alquiler (€) *</span>
            <input
              required
              className="border px-3 py-2 rounded"
              type="number"
              step="any"
              value={data.nonop_rent_anual}
              onChange={e => updateField('nonop_rent_anual', Number(e.target.value))}
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Otros (€) *</span>
            <input
              required
              className="border px-3 py-2 rounded"
              type="number"
              step="any"
              value={data.nonop_other_anual}
              onChange={e => updateField('nonop_other_anual', Number(e.target.value))}
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
            Guardar configuración
          </button>
        </div>
      )}
    </form>
  );
}
