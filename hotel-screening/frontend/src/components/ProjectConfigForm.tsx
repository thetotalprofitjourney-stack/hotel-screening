import React, { useState } from 'react';
import NumericInput from './NumericInput';

export interface ProjectConfig {
  // Datos del proyecto
  nombre: string;
  comunidad_autonoma: string;
  provincia: string;
  zona: string;
  segmento: 'urbano' | 'vacacional';
  categoria: 'economy' | 'midscale' | 'upper_midscale' | 'upscale' | 'upper_upscale' | 'luxury';
  habitaciones: number;
  horizonte: number;
  moneda: string;
  rol: 'inversor' | 'operador' | 'banco';

  // Financiación
  precio_compra: number;
  capex_inicial: number;
  ltv: number;
  interes: number;
  plazo_anios: number;
  tipo_amortizacion: 'frances' | 'bullet';

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
  metodo_valoracion: 'cap_rate' | 'multiplo';
  cap_rate_salida: number | null;
  multiplo_salida: number | null;
  coste_tx_compra_pct: number | null;
  coste_tx_venta_pct: number;

  // Non-operating
  nonop_taxes_anual: number;
  nonop_insurance_anual: number;
  nonop_rent_anual: number;
  nonop_other_anual: number;
}

interface ProjectConfigFormProps {
  initialData?: Partial<ProjectConfig>;
  onSubmit: (data: ProjectConfig) => void;
  onCancel?: () => void;
}

export default function ProjectConfigForm({ initialData, onSubmit, onCancel }: ProjectConfigFormProps) {
  const [config, setConfig] = useState<ProjectConfig>({
    // Defaults
    nombre: initialData?.nombre || '',
    comunidad_autonoma: initialData?.comunidad_autonoma || '',
    provincia: initialData?.provincia || '',
    zona: initialData?.zona || '',
    segmento: initialData?.segmento || 'urbano',
    categoria: initialData?.categoria || 'upscale',
    habitaciones: initialData?.habitaciones || 100,
    horizonte: initialData?.horizonte || 7,
    moneda: initialData?.moneda || 'EUR',
    rol: initialData?.rol || 'inversor',

    precio_compra: initialData?.precio_compra || 0,
    capex_inicial: initialData?.capex_inicial || 0,
    ltv: initialData?.ltv || 0.65,
    interes: initialData?.interes || 0.045,
    plazo_anios: initialData?.plazo_anios || 10,
    tipo_amortizacion: initialData?.tipo_amortizacion || 'frances',

    operacion_tipo: initialData?.operacion_tipo || 'operador',
    fee_base_anual: initialData?.fee_base_anual || null,
    fee_pct_total_rev: initialData?.fee_pct_total_rev || null,
    fee_pct_gop: initialData?.fee_pct_gop || null,
    fee_incentive_pct: initialData?.fee_incentive_pct || null,
    fee_hurdle_gop_margin: initialData?.fee_hurdle_gop_margin || null,
    gop_ajustado: initialData?.gop_ajustado || false,

    ffe: initialData?.ffe || 0.04,
    metodo_valoracion: initialData?.metodo_valoracion || 'cap_rate',
    cap_rate_salida: initialData?.cap_rate_salida || 0.08,
    multiplo_salida: initialData?.multiplo_salida || null,
    coste_tx_compra_pct: initialData?.coste_tx_compra_pct || 0.03,
    coste_tx_venta_pct: initialData?.coste_tx_venta_pct || 0.02,

    nonop_taxes_anual: initialData?.nonop_taxes_anual || 0,
    nonop_insurance_anual: initialData?.nonop_insurance_anual || 0,
    nonop_rent_anual: initialData?.nonop_rent_anual || 0,
    nonop_other_anual: initialData?.nonop_other_anual || 0,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(config);
  }

  function updateField<K extends keyof ProjectConfig>(field: K, value: ProjectConfig[K]) {
    setConfig({ ...config, [field]: value });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Sección 1: Datos del Proyecto */}
      <section className="border rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">1. Datos del Proyecto</h3>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Nombre del proyecto *</span>
            <input
              required
              className="border px-3 py-2 rounded"
              type="text"
              value={config.nombre}
              onChange={e => updateField('nombre', e.target.value)}
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Comunidad Autónoma *</span>
            <input
              required
              className="border px-3 py-2 rounded"
              type="text"
              placeholder="ej: Andalucía"
              value={config.comunidad_autonoma}
              onChange={e => updateField('comunidad_autonoma', e.target.value)}
            />
            <span className="text-xs text-gray-500 mt-1">
              Nivel 1: Filtra las opciones de Provincia
            </span>
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Provincia *</span>
            <input
              required
              className="border px-3 py-2 rounded"
              type="text"
              placeholder="ej: Málaga"
              value={config.provincia}
              onChange={e => updateField('provincia', e.target.value)}
            />
            <span className="text-xs text-gray-500 mt-1">
              Nivel 2: Filtra las opciones de Zona
            </span>
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Zona *</span>
            <input
              required
              className="border px-3 py-2 rounded"
              type="text"
              placeholder="ej: Costa del Sol"
              value={config.zona}
              onChange={e => updateField('zona', e.target.value)}
            />
            <span className="text-xs text-gray-500 mt-1">
              Nivel 3: Define la ubicación geográfica para el benchmark
            </span>
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Rol *</span>
            <select
              required
              className="border px-3 py-2 rounded"
              value={config.rol}
              onChange={e => updateField('rol', e.target.value as ProjectConfig['rol'])}
            >
              <option value="inversor">Inversor</option>
              <option value="operador">Operador</option>
              <option value="banco">Banco</option>
            </select>
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Segmento *</span>
            <select
              required
              className="border px-3 py-2 rounded"
              value={config.segmento}
              onChange={e => updateField('segmento', e.target.value as ProjectConfig['segmento'])}
            >
              <option value="urbano">Urbano</option>
              <option value="vacacional">Vacacional</option>
            </select>
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Categoría *</span>
            <select
              required
              className="border px-3 py-2 rounded"
              value={config.categoria}
              onChange={e => updateField('categoria', e.target.value as ProjectConfig['categoria'])}
            >
              <option value="economy">Economy (2*)</option>
              <option value="midscale">Midscale (3*)</option>
              <option value="upper_midscale">Upper Midscale (3* sup)</option>
              <option value="upscale">Upscale (4*)</option>
              <option value="upper_upscale">Upper Upscale (4* sup)</option>
              <option value="luxury">Luxury (5*)</option>
            </select>
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Habitaciones *</span>
            <input
              required
              className="border px-3 py-2 rounded"
              type="number"
              min={1}
              value={config.habitaciones}
              onChange={e => updateField('habitaciones', Number(e.target.value))}
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Horizonte (años) *</span>
            <input
              required
              className="border px-3 py-2 rounded"
              type="number"
              min={1}
              max={40}
              value={config.horizonte}
              onChange={e => updateField('horizonte', Number(e.target.value))}
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Moneda *</span>
            <input
              required
              className="border px-3 py-2 rounded"
              type="text"
              maxLength={3}
              value={config.moneda}
              onChange={e => updateField('moneda', e.target.value.toUpperCase())}
            />
          </label>
        </div>
      </section>

      {/* Sección 2: Financiación */}
      <section className="border rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">2. Financiación</h3>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Precio de compra (€) *</span>
            <input
              required
              className="border px-3 py-2 rounded"
              type="number"
              step="any"
              value={config.precio_compra}
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
              value={config.capex_inicial}
              onChange={e => updateField('capex_inicial', Number(e.target.value))}
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">LTV % *</span>
            <NumericInput
              required
              className="border px-3 py-2 rounded"
              value={config.ltv * 100}
              onChange={val => updateField('ltv', val / 100)}
              decimals={2}
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Tasa de interés % *</span>
            <NumericInput
              required
              className="border px-3 py-2 rounded"
              value={config.interes * 100}
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
              value={config.plazo_anios}
              onChange={e => updateField('plazo_anios', Number(e.target.value))}
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Tipo de amortización *</span>
            <select
              required
              className="border px-3 py-2 rounded"
              value={config.tipo_amortizacion}
              onChange={e => updateField('tipo_amortizacion', e.target.value as ProjectConfig['tipo_amortizacion'])}
            >
              <option value="frances">Francés</option>
              <option value="bullet">Bullet</option>
            </select>
          </label>
        </div>
      </section>

      {/* Sección 3: Contrato Operador */}
      <section className="border rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">3. Contrato Operador</h3>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Tipo de operación *</span>
            <select
              required
              className="border px-3 py-2 rounded"
              value={config.operacion_tipo}
              onChange={e => updateField('operacion_tipo', e.target.value as ProjectConfig['operacion_tipo'])}
            >
              <option value="gestion_propia">Gestión propia</option>
              <option value="operador">Operador externo</option>
            </select>
          </label>

          {config.operacion_tipo === 'operador' && (
            <label className="flex flex-col">
              <span className="text-sm font-medium mb-1">Tipo de GOP para cálculo de fees</span>
              <select
                className="border px-3 py-2 rounded"
                value={config.gop_ajustado ? 'ajustado' : 'standard'}
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

          {config.operacion_tipo === 'operador' && (
            <>

              <label className="flex flex-col">
                <span className="text-sm font-medium mb-1">Fee base anual (€)</span>
                <input
                  className="border px-3 py-2 rounded"
                  type="number"
                  step="any"
                  value={config.fee_base_anual ?? ''}
                  onChange={e => updateField('fee_base_anual', e.target.value ? Number(e.target.value) : null)}
                />
              </label>

              <label className="flex flex-col">
                <span className="text-sm font-medium mb-1">Fee % sobre TOTAL REV</span>
                <NumericInput
                  className="border px-3 py-2 rounded"
                  value={config.fee_pct_total_rev !== null ? config.fee_pct_total_rev * 100 : ''}
                  onChange={val => updateField('fee_pct_total_rev', val === 0 && !config.fee_pct_total_rev ? null : val / 100)}
                  decimals={2}
                />
              </label>

              <label className="flex flex-col">
                <span className="text-sm font-medium mb-1">Fee % sobre GOP</span>
                <NumericInput
                  className="border px-3 py-2 rounded"
                  value={config.fee_pct_gop !== null ? config.fee_pct_gop * 100 : ''}
                  onChange={val => updateField('fee_pct_gop', val === 0 && !config.fee_pct_gop ? null : val / 100)}
                  decimals={2}
                />
              </label>

              <label className="flex flex-col">
                <span className="text-sm font-medium mb-1">Fee incentivo %</span>
                <NumericInput
                  className="border px-3 py-2 rounded"
                  value={config.fee_incentive_pct !== null ? config.fee_incentive_pct * 100 : ''}
                  onChange={val => updateField('fee_incentive_pct', val === 0 && !config.fee_incentive_pct ? null : val / 100)}
                  decimals={2}
                />
              </label>

              <label className="flex flex-col">
                <span className="text-sm font-medium mb-1">Hurdle GOP margin %</span>
                <NumericInput
                  className="border px-3 py-2 rounded"
                  value={config.fee_hurdle_gop_margin !== null ? config.fee_hurdle_gop_margin * 100 : ''}
                  onChange={val => updateField('fee_hurdle_gop_margin', val === 0 && !config.fee_hurdle_gop_margin ? null : val / 100)}
                  decimals={2}
                />
              </label>
            </>
          )}
        </div>
      </section>

      {/* Sección 4: Settings y Valoración */}
      <section className="border rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">4. Configuración y Valoración</h3>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">FF&E (% sobre ingresos) *</span>
            <NumericInput
              required
              className="border px-3 py-2 rounded"
              value={config.ffe * 100}
              onChange={val => updateField('ffe', val / 100)}
              decimals={2}
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Método de valoración *</span>
            <select
              required
              className="border px-3 py-2 rounded"
              value={config.metodo_valoracion}
              onChange={e => updateField('metodo_valoracion', e.target.value as ProjectConfig['metodo_valoracion'])}
            >
              <option value="cap_rate">Cap Rate</option>
              <option value="multiplo">Múltiplo</option>
            </select>
          </label>

          {config.metodo_valoracion === 'cap_rate' && (
            <label className="flex flex-col">
              <span className="text-sm font-medium mb-1">Cap rate salida % *</span>
              <NumericInput
                className="border px-3 py-2 rounded"
                required
                value={config.cap_rate_salida !== null ? config.cap_rate_salida * 100 : ''}
                onChange={val => updateField('cap_rate_salida', val === 0 && !config.cap_rate_salida ? null : val / 100)}
                decimals={2}
              />
            </label>
          )}

          {config.metodo_valoracion === 'multiplo' && (
            <label className="flex flex-col">
              <span className="text-sm font-medium mb-1">Múltiplo salida *</span>
              <input
                className="border px-3 py-2 rounded"
                type="number"
                step="any"
                required
                value={config.multiplo_salida ?? ''}
                onChange={e => updateField('multiplo_salida', e.target.value ? Number(e.target.value) : null)}
              />
            </label>
          )}

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Coste transacción compra %</span>
            <NumericInput
              className="border px-3 py-2 rounded"
              value={config.coste_tx_compra_pct !== null ? config.coste_tx_compra_pct * 100 : ''}
              onChange={val => updateField('coste_tx_compra_pct', val === 0 && !config.coste_tx_compra_pct ? null : val / 100)}
              decimals={2}
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Coste transacción venta % *</span>
            <NumericInput
              required
              className="border px-3 py-2 rounded"
              value={config.coste_tx_venta_pct * 100}
              onChange={val => updateField('coste_tx_venta_pct', val / 100)}
              decimals={2}
            />
          </label>
        </div>
      </section>

      {/* Sección 5: Non-Operating */}
      <section className="border rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">5. Gastos Non-Operating (anual)</h3>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Impuestos (€) *</span>
            <input
              required
              className="border px-3 py-2 rounded"
              type="number"
              step="any"
              value={config.nonop_taxes_anual}
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
              value={config.nonop_insurance_anual}
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
              value={config.nonop_rent_anual}
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
              value={config.nonop_other_anual}
              onChange={e => updateField('nonop_other_anual', Number(e.target.value))}
            />
          </label>
        </div>
      </section>

      {/* Botones de acción */}
      <div className="flex gap-3 justify-end">
        {onCancel && (
          <button
            type="button"
            className="px-6 py-2 border rounded hover:bg-gray-50"
            onClick={onCancel}
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          className="px-6 py-2 bg-black text-white rounded hover:bg-gray-800"
        >
          Guardar configuración
        </button>
      </div>
    </form>
  );
}
