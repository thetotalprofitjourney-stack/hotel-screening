import React, { useState, useEffect } from 'react';

interface UsaliMonthData {
  mes: number;
  rn: number; // Roomnights
  // Ingresos
  rooms: number;
  fb: number;
  other_operated: number;
  misc_income: number;
  total_rev: number;
  // Gastos departamentales
  dept_rooms: number;
  dept_fb: number;
  dept_other: number;
  dept_total: number;
  dept_profit: number;
  // Undistributed
  und_ag: number;
  und_it: number;
  und_sm: number;
  und_pom: number;
  und_eww: number;
  und_total: number;
  // GOP y otros
  gop: number;
  fees_base: number;
  fees_variable: number;
  fees_incentive: number;
  fees_total: number;
  income_before_nonop: number;
  nonop_total: number;
  ebitda: number;
  ffe_amount: number;
  ebitda_less_ffe: number;
}

interface UsaliEditorProps {
  calculatedData: UsaliMonthData[];
  onSave: (editedData: UsaliMonthData[]) => Promise<void>;
  isGestionPropia?: boolean;
  occupancyData?: Array<{ mes: number; occ: number }>;
  showSaveButton?: boolean;
  onChange?: (editedData: UsaliMonthData[]) => void;
  showSummaryView?: boolean;
  showBannerTop?: boolean; // Si true, muestra banner arriba; si false, abajo
  // Parámetros para recálculo de fees
  feeParams?: {
    base_anual: number | null;
    pct_total_rev: number | null;
    pct_gop: number | null;
    incentive_pct: number | null;
    hurdle_gop_margin: number | null;
    gop_ajustado: boolean;
  };
  nonopTotal?: number; // Total anual de non-operating
  ffePercent?: number; // FF&E como porcentaje (0-1)
}

// Funciones de formateo de números (formato español)
function fmt(n: number) {
  // Números absolutos (€): sin decimales, miles con punto (siempre desde 1.000)
  const rounded = Math.round(n);
  const str = Math.abs(rounded).toString();
  const parts = [];

  for (let i = str.length; i > 0; i -= 3) {
    const start = Math.max(0, i - 3);
    parts.unshift(str.substring(start, i));
  }

  const formatted = parts.join('.');
  return rounded < 0 ? '-' + formatted : formatted;
}

function fmtDecimal(n: number, decimals: number = 2) {
  // Números con decimales: miles con punto, decimales con coma
  return n.toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

export default function UsaliEditor({ calculatedData, onSave, isGestionPropia = false, occupancyData = [], showSaveButton = true, onChange, showSummaryView = true, showBannerTop = true, feeParams, nonopTotal = 0, ffePercent = 0 }: UsaliEditorProps) {
  const [data, setData] = useState<UsaliMonthData[]>(calculatedData);
  const [saving, setSaving] = useState(false);

  // Helper para obtener ocupación de un mes
  const getOccupancy = (mes: number) => {
    const occData = occupancyData.find(o => o.mes === mes);
    return occData ? occData.occ : 0;
  };

  // Helper para cálculo seguro de porcentajes
  const safePct = (val: number, total: number) => {
    if (!total || total === 0) return '0,0%';
    return fmtDecimal((val / total) * 100, 1) + '%';
  };

  // Helper para cálculo seguro de valor por RN
  const safePerRN = (val: number, rn: number) => {
    if (!rn || rn === 0) return '0,00';
    return fmtDecimal(val / rn, 2);
  };

  useEffect(() => {
    setData(calculatedData);
  }, [calculatedData]);

  // Notificar cambios al padre
  useEffect(() => {
    if (onChange) {
      onChange(data);
    }
  }, [data]);

  const updateField = (mesIndex: number, field: keyof UsaliMonthData, value: number) => {
    // Validar que el valor sea un número válido
    if (isNaN(value)) {
      console.warn(`Valor inválido para ${field}: ${value}`);
      return;
    }

    const newData = [...data];
    newData[mesIndex] = { ...newData[mesIndex], [field]: value };

    // Recalcular totales para ese mes
    const m = newData[mesIndex];

    // Total Revenue = rooms + fb + other_operated + misc_income
    m.total_rev = m.rooms + m.fb + m.other_operated + m.misc_income;

    // Dept total y profit
    m.dept_total = m.dept_rooms + m.dept_fb + m.dept_other;
    m.dept_profit = m.total_rev - m.dept_total;

    // Undistributed total
    m.und_total = m.und_ag + m.und_it + m.und_sm + m.und_pom + m.und_eww;

    // GOP
    m.gop = m.dept_profit - m.und_total;

    // FF&E amount (recalcular con el nuevo total_rev)
    m.ffe_amount = ffePercent * m.total_rev;

    // RECALCULAR FEES (usando los parámetros del formulario)
    if (!isGestionPropia && feeParams) {
      const nonop_m = nonopTotal / 12;
      const base_m = feeParams.base_anual ? (feeParams.base_anual / 12) : 0;

      // GOP para cálculo de fees (GOP estándar o GOP ajustado)
      const gop_for_fees = feeParams.gop_ajustado ? (m.gop - m.ffe_amount) : m.gop;

      // Calcular fees
      const fee_total_rev = feeParams.pct_total_rev ? (feeParams.pct_total_rev * m.total_rev) : 0;
      const var_fee = feeParams.pct_gop ? (feeParams.pct_gop * gop_for_fees) : 0;
      const inc_fee = (feeParams.incentive_pct && feeParams.hurdle_gop_margin && (gop_for_fees / m.total_rev >= feeParams.hurdle_gop_margin))
        ? (feeParams.incentive_pct * gop_for_fees) : 0;

      // F.Base incluye Fee Base € + Fee % sobre TOTAL REV
      m.fees_base = base_m + fee_total_rev;
      m.fees_variable = var_fee;
      m.fees_incentive = inc_fee;
      m.fees_total = m.fees_base + m.fees_variable + m.fees_incentive;

      // Recalcular nonop_total mensual
      m.nonop_total = nonop_m;
    } else {
      // Si es gestión propia, fees = 0
      m.fees_base = 0;
      m.fees_variable = 0;
      m.fees_incentive = 0;
      m.fees_total = 0;
      m.nonop_total = nonopTotal / 12;
    }

    // Income before nonop
    m.income_before_nonop = m.gop - m.fees_total;

    // EBITDA
    m.ebitda = m.income_before_nonop - m.nonop_total;

    // EBITDA - FF&E
    m.ebitda_less_ffe = m.ebitda - m.ffe_amount;

    setData(newData);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(data);
    } finally {
      setSaving(false);
    }
  };

  const getAnnualSummary = () => {
    const sum = (field: keyof UsaliMonthData) =>
      data.reduce((acc, m) => acc + (m[field] as number), 0);

    const totalRN = sum('rn');
    const totalRev = sum('total_rev');

    return {
      operating_revenue: sum('total_rev'),
      dept_profit: sum('dept_profit'),
      gop: sum('gop'),
      fees_total: sum('fees_total'),
      ebitda: sum('ebitda'),
      ffe: sum('ffe_amount'),
      ebitda_less_ffe: sum('ebitda_less_ffe'),
      total_rn: totalRN,
      total_rev: totalRev
    };
  };

  const annual = getAnnualSummary();

  // Banner KPIs Año
  const BannerKPIs = () => (
    <div className={`grid gap-3 p-4 bg-gray-50 rounded-lg ${isGestionPropia ? 'grid-cols-5' : 'grid-cols-6'}`}>
      <StatTriple label="Total Rev" value={annual.operating_revenue} totalRN={annual.total_rn} totalRev={annual.total_rev} />
      <StatTriple label="Dept Profit" value={annual.dept_profit} totalRN={annual.total_rn} totalRev={annual.total_rev} />
      <StatTriple label="GOP" value={annual.gop} totalRN={annual.total_rn} totalRev={annual.total_rev} />
      {!isGestionPropia && <StatTriple label="Fees Operador" value={annual.fees_total} totalRN={annual.total_rn} totalRev={annual.total_rev} />}
      <StatTriple label="EBITDA" value={annual.ebitda} totalRN={annual.total_rn} totalRev={annual.total_rev} />
      <StatTriple label="EBITDA-FF&E" value={annual.ebitda_less_ffe} totalRN={annual.total_rn} totalRev={annual.total_rev} />
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold text-lg">Edición USALI Año 1</h4>
        <p className="text-sm text-gray-600">
          Los valores sugeridos están basados en ratios de mercado. Puedes editarlos libremente.
        </p>
      </div>

      {/* Banner arriba (opcional) */}
      {showBannerTop && <BannerKPIs />}

      {/* Vista Detallada - PRIMERO */}
      <div className="overflow-auto border rounded-lg">
        <h5 className="font-semibold p-3 bg-gray-100 border-b">Vista Detallada (Editable)</h5>
        <table className="w-full text-xs border-collapse">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="p-2 border">Mes</th>
              <th className="p-2 border">% Occ</th>
              <th className="p-1 border">Rooms<br/><span className="text-[10px] font-normal">€ | €/RN | %</span></th>
              <th className="p-1 border">F&B<br/><span className="text-[10px] font-normal">€ | €/RN | %</span></th>
              <th className="p-1 border">Other<br/><span className="text-[10px] font-normal">€ | €/RN | %</span></th>
              <th className="p-1 border">Misc<br/><span className="text-[10px] font-normal">€ | €/RN | %</span></th>
              <th className="p-1 border bg-blue-50">Total Rev<br/><span className="text-[10px] font-normal">€ | €/RN | %</span></th>
              <th className="p-1 border">D.Rooms<br/><span className="text-[10px] font-normal">€ | €/RN | %</span></th>
              <th className="p-1 border">D.F&B<br/><span className="text-[10px] font-normal">€ | €/RN | %</span></th>
              <th className="p-1 border">D.Other<br/><span className="text-[10px] font-normal">€ | €/RN | %</span></th>
              <th className="p-1 border bg-yellow-50">D.Profit<br/><span className="text-[10px] font-normal">€ | €/RN | %</span></th>
              <th className="p-1 border">U.AG<br/><span className="text-[10px] font-normal">€ | €/RN | %</span></th>
              <th className="p-1 border">U.IT<br/><span className="text-[10px] font-normal">€ | €/RN | %</span></th>
              <th className="p-1 border">U.SM<br/><span className="text-[10px] font-normal">€ | €/RN | %</span></th>
              <th className="p-1 border">U.POM<br/><span className="text-[10px] font-normal">€ | €/RN | %</span></th>
              <th className="p-1 border">U.EWW<br/><span className="text-[10px] font-normal">€ | €/RN | %</span></th>
              <th className="p-1 border bg-green-50">GOP<br/><span className="text-[10px] font-normal">€ | €/RN | %</span></th>
              {!isGestionPropia && (
                <>
                  <th className="p-1 border">F.Base<br/><span className="text-[10px] font-normal">€ | €/RN | %</span></th>
                  <th className="p-1 border">F.Var<br/><span className="text-[10px] font-normal">€ | €/RN | %</span></th>
                  <th className="p-1 border">F.Inc<br/><span className="text-[10px] font-normal">€ | €/RN | %</span></th>
                  <th className="p-1 border bg-pink-50">F.Total<br/><span className="text-[10px] font-normal">€ | €/RN | %</span></th>
                </>
              )}
              <th className="p-1 border">Non-op<br/><span className="text-[10px] font-normal">€ | €/RN | %</span></th>
              <th className="p-1 border bg-purple-50">EBITDA<br/><span className="text-[10px] font-normal">€ | €/RN | %</span></th>
              <th className="p-1 border">FF&E<br/><span className="text-[10px] font-normal">€ | €/RN | %</span></th>
              <th className="p-1 border bg-orange-50">EBITDA-FF&E<br/><span className="text-[10px] font-normal">€ | €/RN | %</span></th>
            </tr>
          </thead>
          <tbody>
            {data.map((m, idx) => {
              const occ = getOccupancy(m.mes);

              const renderStackedEditable = (value: number, field: keyof UsaliMonthData, pctBase: number, bgClass: string = '') => (
                <td className={`border ${bgClass} min-w-[100px]`}>
                  <div className="flex flex-col items-end p-2 space-y-0.5">
                    <div className="text-xs font-semibold whitespace-nowrap">{fmt(value)}</div>
                    <div className="text-xs bg-red-50 px-1 rounded w-full">
                      <EditCell value={value} onChange={(v) => updateField(idx, field, v)} rn={m.rn} />
                    </div>
                    <div className="text-xs text-gray-500 whitespace-nowrap">{safePct(value, pctBase)}</div>
                  </div>
                </td>
              );

              const renderStackedReadonly = (value: number, pctBase: number, bgClass: string = '') => (
                <td className={`border ${bgClass} min-w-[100px]`}>
                  <div className="flex flex-col items-end text-xs p-2 space-y-0.5">
                    <div className="font-semibold whitespace-nowrap">{fmt(value)}</div>
                    <div className="text-gray-600 whitespace-nowrap">{safePerRN(value, m.rn)} €/RN</div>
                    <div className="text-gray-500 whitespace-nowrap">{safePct(value, pctBase)}</div>
                  </div>
                </td>
              );

              return (
                <tr key={m.mes} className="hover:bg-gray-50">
                  <td className="p-2 border text-center font-medium">{m.mes}</td>
                  <td className="p-2 border text-center">{fmtDecimal(occ * 100, 1)}%</td>

                  {/* Rooms - NO EDITABLE */}
                  {renderStackedReadonly(m.rooms, m.total_rev)}

                  {/* Revenues - EDITABLES */}
                  {renderStackedEditable(m.fb, 'fb', m.total_rev)}
                  {renderStackedEditable(m.other_operated, 'other_operated', m.total_rev)}
                  {renderStackedEditable(m.misc_income, 'misc_income', m.total_rev)}

                  {/* Total Rev - NO EDITABLE */}
                  {renderStackedReadonly(m.total_rev, m.total_rev, 'bg-blue-50')}

                  {/* Dept - EDITABLES */}
                  {renderStackedEditable(m.dept_rooms, 'dept_rooms', m.rooms)}
                  {renderStackedEditable(m.dept_fb, 'dept_fb', m.fb)}
                  {renderStackedEditable(m.dept_other, 'dept_other', m.other_operated + m.misc_income)}

                  {/* Dept Profit - NO EDITABLE */}
                  {renderStackedReadonly(m.dept_profit, m.total_rev, 'bg-yellow-50')}

                  {/* Undistributed - EDITABLES */}
                  {renderStackedEditable(m.und_ag, 'und_ag', m.total_rev)}
                  {renderStackedEditable(m.und_it, 'und_it', m.total_rev)}
                  {renderStackedEditable(m.und_sm, 'und_sm', m.total_rev)}
                  {renderStackedEditable(m.und_pom, 'und_pom', m.total_rev)}
                  {renderStackedEditable(m.und_eww, 'und_eww', m.total_rev)}

                  {/* GOP - NO EDITABLE */}
                  {renderStackedReadonly(m.gop, m.total_rev, 'bg-green-50')}

                  {!isGestionPropia && (
                    <>
                      {/* Fees - NO EDITABLES (se calculan desde formulario) */}
                      {renderStackedReadonly(m.fees_base, m.total_rev)}
                      {renderStackedReadonly(m.fees_variable, m.total_rev)}
                      {renderStackedReadonly(m.fees_incentive, m.total_rev)}

                      {/* Fees Total - NO EDITABLE */}
                      {renderStackedReadonly(m.fees_total, m.total_rev, 'bg-pink-50')}
                    </>
                  )}

                  {/* Non-op - NO EDITABLE (se calcula desde formulario) */}
                  {renderStackedReadonly(m.nonop_total, m.total_rev)}

                  {/* EBITDA - NO EDITABLE */}
                  {renderStackedReadonly(m.ebitda, m.total_rev, 'bg-purple-50')}

                  {/* FF&E - NO EDITABLE (se calcula desde formulario) */}
                  {renderStackedReadonly(m.ffe_amount, m.total_rev)}

                  {/* EBITDA-FF&E - NO EDITABLE */}
                  {renderStackedReadonly(m.ebitda_less_ffe, m.total_rev, 'bg-orange-50')}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Vista Resumida - SEGUNDO (oculta por defecto) */}
      {showSummaryView && (
        <div className="overflow-auto border rounded-lg">
        <h5 className="font-semibold p-3 bg-gray-100 border-b">Vista Resumida</h5>
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Mes</th>
              <th className="p-2 border">% Occ</th>
              <th className="p-2 border bg-blue-50">Total Rev<br/><span className="text-xs font-normal">€ | €/RN | %</span></th>
              <th className="p-2 border bg-yellow-50">Dept Profit<br/><span className="text-xs font-normal">€ | €/RN | %</span></th>
              <th className="p-2 border bg-green-50">GOP<br/><span className="text-xs font-normal">€ | €/RN | %</span></th>
              {!isGestionPropia && <th className="p-2 border bg-pink-50">Fees Operador<br/><span className="text-xs font-normal">€ | €/RN | %</span></th>}
              <th className="p-2 border bg-purple-50">EBITDA<br/><span className="text-xs font-normal">€ | €/RN | %</span></th>
            </tr>
          </thead>
          <tbody>
            {data.map((m) => {
              const occ = getOccupancy(m.mes);
              const renderStacked = (value: number, bgClass: string) => (
                <td className={`border ${bgClass}`}>
                  <div className="flex flex-col items-end p-1 space-y-0.5">
                    <div className="text-base font-semibold">{fmt(value)}</div>
                    <div className="text-xs text-gray-600">{safePerRN(value, m.rn)} €/RN</div>
                    <div className="text-xs text-gray-500">{safePct(value, m.total_rev)}</div>
                  </div>
                </td>
              );

              return (
                <tr key={m.mes} className="hover:bg-gray-50">
                  <td className="p-2 border text-center font-medium">{m.mes}</td>
                  <td className="p-2 border text-center">{fmtDecimal(occ * 100, 1)}%</td>
                  {renderStacked(m.total_rev, 'bg-blue-50')}
                  {renderStacked(m.dept_profit, 'bg-yellow-50')}
                  {renderStacked(m.gop, 'bg-green-50')}
                  {!isGestionPropia && renderStacked(m.fees_total, 'bg-pink-50')}
                  {renderStacked(m.ebitda, 'bg-purple-50')}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      {/* Banner abajo (si no se muestra arriba) */}
      {!showBannerTop && <BannerKPIs />}

      {/* Nota informativa */}
      <div className="text-sm bg-yellow-50 p-3 rounded border border-yellow-200">
        <strong>Nota:</strong> Los campos editables se muestran sobre fondo rojo y modifican en €/RN. Los valores de Fees, Non-op y FF&E se configuran desde el formulario de arriba. El resto de campos se recalculan automáticamente.
      </div>

      {/* Botón Guardar debajo de la tabla detallada (opcional) */}
      {showSaveButton && (
        <div className="flex justify-start">
          <button
            className="px-4 py-2 bg-black text-white rounded disabled:bg-gray-400"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Guardar USALI Y1'}
          </button>
        </div>
      )}
    </div>
  );
}

function EditCell({ value, onChange, rn }: { value: number; onChange: (value: number) => void; rn?: number }) {
  const [editing, setEditing] = useState(false);
  // Si rn está definido, trabajamos en modo €/RN
  const isPerRN = rn !== undefined && rn > 0;
  const displayValue = isPerRN ? (value / rn) : value;
  const [tempValue, setTempValue] = useState(fmtDecimal(displayValue, 2));

  useEffect(() => {
    const newDisplayValue = isPerRN ? (value / rn!) : value;
    setTempValue(fmtDecimal(newDisplayValue, 2));
  }, [value, rn, isPerRN]);

  const handleBlur = () => {
    setEditing(false);
    // Convertir formato español a número (reemplazar coma por punto)
    const normalized = tempValue.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(normalized);
    if (!isNaN(num)) {
      // Si estamos en modo €/RN, convertir a € antes de guardar
      const finalValue = isPerRN ? num * rn! : num;
      onChange(finalValue);
    } else {
      const newDisplayValue = isPerRN ? (value / rn!) : value;
      setTempValue(fmtDecimal(newDisplayValue, 2));
    }
  };

  if (editing) {
    return (
      <input
        type="text"
        className="w-full px-1 py-1 text-right border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-red-600 font-medium"
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleBlur();
          if (e.key === 'Escape') {
            const newDisplayValue = isPerRN ? (value / rn!) : value;
            setTempValue(fmtDecimal(newDisplayValue, 2));
            setEditing(false);
          }
        }}
        autoFocus
      />
    );
  }

  return (
    <div
      className="w-full px-1 py-1 text-right cursor-pointer hover:bg-blue-50 rounded text-red-600 font-medium"
      onClick={() => setEditing(true)}
      title="Click para editar (€/RN)"
    >
      {fmtDecimal(displayValue, 2)}
    </div>
  );
}

function StatTriple({ label, value, totalRN, totalRev }: { label: string; value: number; totalRN: number; totalRev: number }) {
  const perRN = value / Math.max(1, totalRN);
  const pct = (value / Math.max(1, totalRev)) * 100;

  return (
    <div className="text-center">
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <div className="text-lg font-semibold">
        {Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)}
      </div>
      <div className="text-xs text-gray-500 mt-1">
        €{fmtDecimal(perRN, 2)}/RN | {fmtDecimal(pct, 1)}%
      </div>
    </div>
  );
}

