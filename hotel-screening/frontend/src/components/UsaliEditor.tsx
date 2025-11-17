import React, { useState, useEffect } from 'react';

interface UsaliMonthData {
  mes: number;
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
  habitaciones: number;
  meses: any[]; // Para obtener ocupación y calcular roomnights
}

// Días por mes (febrero con 28 días siempre)
const DIAS_MES = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export default function UsaliEditor({ calculatedData, onSave, habitaciones, meses }: UsaliEditorProps) {
  const [data, setData] = useState<UsaliMonthData[]>(calculatedData);
  const [showDetailed, setShowDetailed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setData(calculatedData);
  }, [calculatedData]);

  const updateField = (mesIndex: number, field: keyof UsaliMonthData, value: number) => {
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

    // Fees total
    m.fees_total = m.fees_base + m.fees_variable + m.fees_incentive;

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

  // Calcular roomnights para un mes dado
  const calcRoomnights = (mesNum: number): number => {
    const mesData = meses.find(m => m.mes === mesNum);
    if (!mesData) return 0;
    const ocupacion = mesData.ocupacion ?? mesData.occ ?? 0;
    const dias = DIAS_MES[mesNum - 1] || 30;
    return habitaciones * dias * ocupacion;
  };

  const getAnnualSummary = () => {
    const sum = (field: keyof UsaliMonthData) =>
      data.reduce((acc, m) => acc + (m[field] as number), 0);

    return {
      operating_revenue: sum('total_rev'),
      dept_profit: sum('dept_profit'),
      gop: sum('gop'),
      ebitda: sum('ebitda'),
      ffe: sum('ffe_amount'),
      ebitda_less_ffe: sum('ebitda_less_ffe'),
      gop_margin: sum('gop') / Math.max(1, sum('total_rev')),
      ebitda_margin: sum('ebitda') / Math.max(1, sum('total_rev'))
    };
  };

  const annual = getAnnualSummary();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="font-semibold text-lg">Edición USALI Año 1</h4>
          <p className="text-sm text-gray-600">
            Los valores sugeridos están basados en ratios de mercado. Puedes editarlos libremente.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="px-3 py-2 border rounded text-sm"
            onClick={() => setShowDetailed(!showDetailed)}
          >
            {showDetailed ? 'Vista resumida' : 'Vista detallada'}
          </button>
          <button
            className="px-4 py-2 bg-black text-white rounded disabled:bg-gray-400"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Guardar USALI Y1'}
          </button>
        </div>
      </div>

      {/* Resumen Anual */}
      <div className="grid grid-cols-6 gap-3 p-4 bg-gray-50 rounded-lg">
        <Stat label="Total Rev" value={annual.operating_revenue} />
        <Stat label="Dept Profit" value={annual.dept_profit} />
        <Stat label="GOP" value={annual.gop} />
        <Stat label="EBITDA" value={annual.ebitda} />
        <Stat label="FF&E" value={annual.ffe} />
        <Stat label="EBITDA - FF&E" value={annual.ebitda_less_ffe} />
      </div>

      {/* Tabla mensual detallada */}
      {showDetailed ? (
        <div className="overflow-auto border rounded-lg">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="p-2 border text-left" rowSpan={2}>Mes</th>
                <th className="p-2 border text-right">Rooms Rev</th>
                <th className="p-2 border text-right">F&B Rev</th>
                <th className="p-2 border text-right">Other Op</th>
                <th className="p-2 border text-right">Misc</th>
                <th className="p-2 border text-center bg-blue-50" colSpan={3}>Total Rev</th>
                <th className="p-2 border text-right">Dept Rooms</th>
                <th className="p-2 border text-right">Dept F&B</th>
                <th className="p-2 border text-right">Dept Other</th>
                <th className="p-2 border text-center bg-yellow-50" colSpan={3}>Dept Profit</th>
                <th className="p-2 border text-right">Und AG</th>
                <th className="p-2 border text-right">Und IT</th>
                <th className="p-2 border text-right">Und SM</th>
                <th className="p-2 border text-right">Und POM</th>
                <th className="p-2 border text-right">Und EWW</th>
                <th className="p-2 border text-center bg-green-50" colSpan={3}>GOP</th>
                <th className="p-2 border text-right">Fees Base</th>
                <th className="p-2 border text-right">Fees Var</th>
                <th className="p-2 border text-right">Fees Inc</th>
                <th className="p-2 border text-right">Non-op</th>
                <th className="p-2 border text-center bg-purple-50" colSpan={3}>EBITDA</th>
                <th className="p-2 border text-right">FF&E</th>
                <th className="p-2 border text-center bg-orange-50" colSpan={3}>EBITDA-FF&E</th>
              </tr>
              <tr>
                <th className="p-1 border text-xs"></th>
                <th className="p-1 border text-xs"></th>
                <th className="p-1 border text-xs"></th>
                <th className="p-1 border text-xs"></th>
                <th className="p-1 border text-xs bg-blue-50">€</th>
                <th className="p-1 border text-xs bg-blue-50">%</th>
                <th className="p-1 border text-xs bg-blue-50">€/RN</th>
                <th className="p-1 border text-xs"></th>
                <th className="p-1 border text-xs"></th>
                <th className="p-1 border text-xs"></th>
                <th className="p-1 border text-xs bg-yellow-50">€</th>
                <th className="p-1 border text-xs bg-yellow-50">%</th>
                <th className="p-1 border text-xs bg-yellow-50">€/RN</th>
                <th className="p-1 border text-xs"></th>
                <th className="p-1 border text-xs"></th>
                <th className="p-1 border text-xs"></th>
                <th className="p-1 border text-xs"></th>
                <th className="p-1 border text-xs"></th>
                <th className="p-1 border text-xs bg-green-50">€</th>
                <th className="p-1 border text-xs bg-green-50">%</th>
                <th className="p-1 border text-xs bg-green-50">€/RN</th>
                <th className="p-1 border text-xs"></th>
                <th className="p-1 border text-xs"></th>
                <th className="p-1 border text-xs"></th>
                <th className="p-1 border text-xs"></th>
                <th className="p-1 border text-xs bg-purple-50">€</th>
                <th className="p-1 border text-xs bg-purple-50">%</th>
                <th className="p-1 border text-xs bg-purple-50">€/RN</th>
                <th className="p-1 border text-xs"></th>
                <th className="p-1 border text-xs bg-orange-50">€</th>
                <th className="p-1 border text-xs bg-orange-50">%</th>
                <th className="p-1 border text-xs bg-orange-50">€/RN</th>
              </tr>
            </thead>
            <tbody>
              {data.map((m, idx) => {
                const roomnights = calcRoomnights(m.mes);
                const pctTotalRev = (val: number) => m.total_rev > 0 ? (val / m.total_rev * 100) : 0;
                const perRN = (val: number) => roomnights > 0 ? (val / roomnights) : 0;

                return (
                  <tr key={m.mes} className="hover:bg-gray-50">
                    <td className="p-2 border text-center font-medium">{m.mes}</td>
                    <td className="p-1 border"><EditCell value={m.rooms} onChange={(v) => updateField(idx, 'rooms', v)} /></td>
                    <td className="p-1 border"><EditCell value={m.fb} onChange={(v) => updateField(idx, 'fb', v)} /></td>
                    <td className="p-1 border"><EditCell value={m.other_operated} onChange={(v) => updateField(idx, 'other_operated', v)} /></td>
                    <td className="p-1 border"><EditCell value={m.misc_income} onChange={(v) => updateField(idx, 'misc_income', v)} /></td>
                    <td className="p-2 border text-right bg-blue-50 font-semibold">{fmt(m.total_rev)}</td>
                    <td className="p-2 border text-right bg-blue-50 text-xs">100%</td>
                    <td className="p-2 border text-right bg-blue-50 text-xs">{perRN(m.total_rev).toFixed(2)}</td>
                    <td className="p-1 border"><EditCell value={m.dept_rooms} onChange={(v) => updateField(idx, 'dept_rooms', v)} /></td>
                    <td className="p-1 border"><EditCell value={m.dept_fb} onChange={(v) => updateField(idx, 'dept_fb', v)} /></td>
                    <td className="p-1 border"><EditCell value={m.dept_other} onChange={(v) => updateField(idx, 'dept_other', v)} /></td>
                    <td className="p-2 border text-right bg-yellow-50 font-semibold">{fmt(m.dept_profit)}</td>
                    <td className="p-2 border text-right bg-yellow-50 text-xs">{pctTotalRev(m.dept_profit).toFixed(1)}%</td>
                    <td className="p-2 border text-right bg-yellow-50 text-xs">{perRN(m.dept_profit).toFixed(2)}</td>
                    <td className="p-1 border"><EditCell value={m.und_ag} onChange={(v) => updateField(idx, 'und_ag', v)} /></td>
                    <td className="p-1 border"><EditCell value={m.und_it} onChange={(v) => updateField(idx, 'und_it', v)} /></td>
                    <td className="p-1 border"><EditCell value={m.und_sm} onChange={(v) => updateField(idx, 'und_sm', v)} /></td>
                    <td className="p-1 border"><EditCell value={m.und_pom} onChange={(v) => updateField(idx, 'und_pom', v)} /></td>
                    <td className="p-1 border"><EditCell value={m.und_eww} onChange={(v) => updateField(idx, 'und_eww', v)} /></td>
                    <td className="p-2 border text-right bg-green-50 font-semibold">{fmt(m.gop)}</td>
                    <td className="p-2 border text-right bg-green-50 text-xs">{pctTotalRev(m.gop).toFixed(1)}%</td>
                    <td className="p-2 border text-right bg-green-50 text-xs">{perRN(m.gop).toFixed(2)}</td>
                    <td className="p-1 border"><EditCell value={m.fees_base} onChange={(v) => updateField(idx, 'fees_base', v)} /></td>
                    <td className="p-1 border"><EditCell value={m.fees_variable} onChange={(v) => updateField(idx, 'fees_variable', v)} /></td>
                    <td className="p-1 border"><EditCell value={m.fees_incentive} onChange={(v) => updateField(idx, 'fees_incentive', v)} /></td>
                    <td className="p-1 border"><EditCell value={m.nonop_total} onChange={(v) => updateField(idx, 'nonop_total', v)} /></td>
                    <td className="p-2 border text-right bg-purple-50 font-semibold">{fmt(m.ebitda)}</td>
                    <td className="p-2 border text-right bg-purple-50 text-xs">{pctTotalRev(m.ebitda).toFixed(1)}%</td>
                    <td className="p-2 border text-right bg-purple-50 text-xs">{perRN(m.ebitda).toFixed(2)}</td>
                    <td className="p-1 border"><EditCell value={m.ffe_amount} onChange={(v) => updateField(idx, 'ffe_amount', v)} /></td>
                    <td className="p-2 border text-right bg-orange-50 font-semibold">{fmt(m.ebitda_less_ffe)}</td>
                    <td className="p-2 border text-right bg-orange-50 text-xs">{pctTotalRev(m.ebitda_less_ffe).toFixed(1)}%</td>
                    <td className="p-2 border text-right bg-orange-50 text-xs">{perRN(m.ebitda_less_ffe).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-auto border rounded-lg">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Mes</th>
                <th className="p-2 border bg-blue-50">Total Rev</th>
                <th className="p-2 border bg-yellow-50">Dept Profit</th>
                <th className="p-2 border bg-green-50">GOP</th>
                <th className="p-2 border bg-purple-50">EBITDA</th>
                <th className="p-2 border">FF&E</th>
                <th className="p-2 border bg-orange-50">EBITDA-FF&E</th>
              </tr>
            </thead>
            <tbody>
              {data.map((m, idx) => (
                <tr key={m.mes} className="hover:bg-gray-50">
                  <td className="p-2 border text-center font-medium">{m.mes}</td>
                  <td className="p-2 border text-right bg-blue-50 font-semibold">{fmt(m.total_rev)}</td>
                  <td className="p-2 border text-right bg-yellow-50 font-semibold">{fmt(m.dept_profit)}</td>
                  <td className="p-2 border text-right bg-green-50 font-semibold">{fmt(m.gop)}</td>
                  <td className="p-2 border text-right bg-purple-50 font-semibold">{fmt(m.ebitda)}</td>
                  <td className="p-1 border"><EditCell value={m.ffe_amount} onChange={(v) => updateField(idx, 'ffe_amount', v)} /></td>
                  <td className="p-2 border text-right bg-orange-50 font-semibold">{fmt(m.ebitda_less_ffe)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EditCell({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [tempValue, setTempValue] = useState(String(Math.round(value)));

  useEffect(() => {
    setTempValue(String(Math.round(value)));
  }, [value]);

  const handleBlur = () => {
    setEditing(false);
    const num = parseFloat(tempValue);
    if (!isNaN(num)) {
      onChange(num);
    } else {
      setTempValue(String(Math.round(value)));
    }
  };

  if (editing) {
    return (
      <input
        type="number"
        className="w-full px-1 py-1 text-right border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleBlur();
          if (e.key === 'Escape') {
            setTempValue(String(Math.round(value)));
            setEditing(false);
          }
        }}
        autoFocus
      />
    );
  }

  return (
    <div
      className="w-full px-1 py-1 text-right cursor-pointer hover:bg-blue-50 rounded"
      onClick={() => setEditing(true)}
      title="Click para editar"
    >
      {fmt(value)}
    </div>
  );
}

function fmt(n: number) {
  return Math.round(n).toLocaleString('es-ES');
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <div className="text-lg font-semibold">
        {Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)}
      </div>
    </div>
  );
}
