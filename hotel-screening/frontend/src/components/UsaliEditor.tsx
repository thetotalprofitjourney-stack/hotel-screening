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
}

export default function UsaliEditor({ calculatedData, onSave }: UsaliEditorProps) {
  const [data, setData] = useState<UsaliMonthData[]>(calculatedData);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setData(calculatedData);
  }, [calculatedData]);

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

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold text-lg">Edición USALI Año 1</h4>
        <p className="text-sm text-gray-600">
          Los valores sugeridos están basados en ratios de mercado. Puedes editarlos libremente.
        </p>
      </div>

      {/* Banner KPIs Año - Con 3 métricas por KPI */}
      <div className="grid grid-cols-5 gap-3 p-4 bg-gray-50 rounded-lg">
        <StatTriple label="Total Rev" value={annual.operating_revenue} totalRN={annual.total_rn} totalRev={annual.total_rev} />
        <StatTriple label="Dept Profit" value={annual.dept_profit} totalRN={annual.total_rn} totalRev={annual.total_rev} />
        <StatTriple label="GOP" value={annual.gop} totalRN={annual.total_rn} totalRev={annual.total_rev} />
        <StatTriple label="Fees Operador" value={annual.fees_total} totalRN={annual.total_rn} totalRev={annual.total_rev} />
        <StatTriple label="EBITDA" value={annual.ebitda} totalRN={annual.total_rn} totalRev={annual.total_rev} />
      </div>

      {/* Vista Resumida */}
      <div className="overflow-auto border rounded-lg">
        <h5 className="font-semibold p-3 bg-gray-100 border-b">Vista Resumida</h5>
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border" rowSpan={2}>Mes</th>
              <th className="p-2 border bg-blue-50" colSpan={3}>Total Rev</th>
              <th className="p-2 border bg-yellow-50" colSpan={3}>Dept Profit</th>
              <th className="p-2 border bg-green-50" colSpan={3}>GOP</th>
              <th className="p-2 border bg-pink-50" colSpan={3}>Fees Operador</th>
              <th className="p-2 border bg-purple-50" colSpan={3}>EBITDA</th>
            </tr>
            <tr>
              <th className="p-1 border text-xs bg-blue-50">€</th>
              <th className="p-1 border text-xs bg-blue-50">€/RN</th>
              <th className="p-1 border text-xs bg-blue-50">%</th>
              <th className="p-1 border text-xs bg-yellow-50">€</th>
              <th className="p-1 border text-xs bg-yellow-50">€/RN</th>
              <th className="p-1 border text-xs bg-yellow-50">%</th>
              <th className="p-1 border text-xs bg-green-50">€</th>
              <th className="p-1 border text-xs bg-green-50">€/RN</th>
              <th className="p-1 border text-xs bg-green-50">%</th>
              <th className="p-1 border text-xs bg-pink-50">€</th>
              <th className="p-1 border text-xs bg-pink-50">€/RN</th>
              <th className="p-1 border text-xs bg-pink-50">%</th>
              <th className="p-1 border text-xs bg-purple-50">€</th>
              <th className="p-1 border text-xs bg-purple-50">€/RN</th>
              <th className="p-1 border text-xs bg-purple-50">%</th>
            </tr>
          </thead>
          <tbody>
            {data.map((m) => {
              const pct = (val: number) => ((val / m.total_rev) * 100).toFixed(1) + '%';
              const perRN = (val: number) => (val / Math.max(1, m.rn)).toFixed(2);
              return (
                <tr key={m.mes} className="hover:bg-gray-50">
                  <td className="p-2 border text-center font-medium">{m.mes}</td>
                  <td className="p-2 border text-right bg-blue-50 font-semibold">{fmt(m.total_rev)}</td>
                  <td className="p-2 border text-right bg-blue-50 text-xs">{perRN(m.total_rev)}</td>
                  <td className="p-2 border text-right bg-blue-50 text-xs">{pct(m.total_rev)}</td>
                  <td className="p-2 border text-right bg-yellow-50 font-semibold">{fmt(m.dept_profit)}</td>
                  <td className="p-2 border text-right bg-yellow-50 text-xs">{perRN(m.dept_profit)}</td>
                  <td className="p-2 border text-right bg-yellow-50 text-xs">{pct(m.dept_profit)}</td>
                  <td className="p-2 border text-right bg-green-50 font-semibold">{fmt(m.gop)}</td>
                  <td className="p-2 border text-right bg-green-50 text-xs">{perRN(m.gop)}</td>
                  <td className="p-2 border text-right bg-green-50 text-xs">{pct(m.gop)}</td>
                  <td className="p-2 border text-right bg-pink-50 font-semibold">{fmt(m.fees_total)}</td>
                  <td className="p-2 border text-right bg-pink-50 text-xs">{perRN(m.fees_total)}</td>
                  <td className="p-2 border text-right bg-pink-50 text-xs">{pct(m.fees_total)}</td>
                  <td className="p-2 border text-right bg-purple-50 font-semibold">{fmt(m.ebitda)}</td>
                  <td className="p-2 border text-right bg-purple-50 text-xs">{perRN(m.ebitda)}</td>
                  <td className="p-2 border text-right bg-purple-50 text-xs">{pct(m.ebitda)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Vista Detallada - Tabla única con 3 valores por columna */}
      <div className="overflow-auto border rounded-lg">
        <h5 className="font-semibold p-3 bg-gray-100 border-b">Vista Detallada (Editable)</h5>
        <table className="w-full text-xs border-collapse">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="p-2 border text-left" rowSpan={2}>Mes</th>
              <th className="p-1 border" colSpan={3}>Rooms Rev</th>
              <th className="p-1 border" colSpan={3}>F&B Rev</th>
              <th className="p-1 border" colSpan={3}>Other Op</th>
              <th className="p-1 border" colSpan={3}>Misc</th>
              <th className="p-1 border bg-blue-50" colSpan={3}>Total Rev</th>
              <th className="p-1 border" colSpan={3}>Dept Rooms</th>
              <th className="p-1 border" colSpan={3}>Dept F&B</th>
              <th className="p-1 border" colSpan={3}>Dept Other</th>
              <th className="p-1 border bg-yellow-50" colSpan={3}>Dept Profit</th>
              <th className="p-1 border" colSpan={3}>Und AG</th>
              <th className="p-1 border" colSpan={3}>Und IT</th>
              <th className="p-1 border" colSpan={3}>Und SM</th>
              <th className="p-1 border" colSpan={3}>Und POM</th>
              <th className="p-1 border" colSpan={3}>Und EWW</th>
              <th className="p-1 border bg-green-50" colSpan={3}>GOP</th>
              <th className="p-1 border" colSpan={3}>Fees Base</th>
              <th className="p-1 border" colSpan={3}>Fees Var</th>
              <th className="p-1 border" colSpan={3}>Fees Inc</th>
              <th className="p-1 border bg-pink-50" colSpan={3}>Fees Total</th>
              <th className="p-1 border" colSpan={3}>Non-op</th>
              <th className="p-1 border bg-purple-50" colSpan={3}>EBITDA</th>
              <th className="p-1 border" colSpan={3}>FF&E</th>
              <th className="p-1 border bg-orange-50" colSpan={3}>EBITDA-FF&E</th>
            </tr>
            <tr>
              {/* Repetir para cada columna: €, €/RN, % */}
              {Array(34).fill(null).map((_, i) => (
                <React.Fragment key={i}>
                  <th className="p-1 border text-xs">€</th>
                  <th className="p-1 border text-xs">€/RN</th>
                  <th className="p-1 border text-xs">%</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((m, idx) => {
              const pct = (val: number) => ((val / m.total_rev) * 100).toFixed(1) + '%';
              const perRN = (val: number) => (val / Math.max(1, m.rn)).toFixed(2);

              return (
                <tr key={m.mes} className="hover:bg-gray-50">
                  <td className="p-2 border text-center font-medium">{m.mes}</td>

                  {/* Rooms Rev */}
                  <td className="p-1 border bg-gray-100"><EditCell value={m.rooms} onChange={(v) => updateField(idx, 'rooms', v)} /></td>
                  <td className="p-1 border text-right text-xs">{perRN(m.rooms)}</td>
                  <td className="p-1 border text-right text-xs">{pct(m.rooms)}</td>

                  {/* F&B Rev */}
                  <td className="p-1 border bg-gray-100"><EditCell value={m.fb} onChange={(v) => updateField(idx, 'fb', v)} /></td>
                  <td className="p-1 border text-right text-xs">{perRN(m.fb)}</td>
                  <td className="p-1 border text-right text-xs">{pct(m.fb)}</td>

                  {/* Other Op */}
                  <td className="p-1 border bg-gray-100"><EditCell value={m.other_operated} onChange={(v) => updateField(idx, 'other_operated', v)} /></td>
                  <td className="p-1 border text-right text-xs">{perRN(m.other_operated)}</td>
                  <td className="p-1 border text-right text-xs">{pct(m.other_operated)}</td>

                  {/* Misc */}
                  <td className="p-1 border bg-gray-100"><EditCell value={m.misc_income} onChange={(v) => updateField(idx, 'misc_income', v)} /></td>
                  <td className="p-1 border text-right text-xs">{perRN(m.misc_income)}</td>
                  <td className="p-1 border text-right text-xs">{pct(m.misc_income)}</td>

                  {/* Total Rev */}
                  <td className="p-2 border text-right bg-blue-50 font-semibold">{fmt(m.total_rev)}</td>
                  <td className="p-1 border text-right bg-blue-50 text-xs">{perRN(m.total_rev)}</td>
                  <td className="p-1 border text-right bg-blue-50 text-xs">{pct(m.total_rev)}</td>

                  {/* Dept Rooms */}
                  <td className="p-1 border bg-gray-100"><EditCell value={m.dept_rooms} onChange={(v) => updateField(idx, 'dept_rooms', v)} /></td>
                  <td className="p-1 border text-right text-xs">{perRN(m.dept_rooms)}</td>
                  <td className="p-1 border text-right text-xs">{pct(m.dept_rooms)}</td>

                  {/* Dept F&B */}
                  <td className="p-1 border bg-gray-100"><EditCell value={m.dept_fb} onChange={(v) => updateField(idx, 'dept_fb', v)} /></td>
                  <td className="p-1 border text-right text-xs">{perRN(m.dept_fb)}</td>
                  <td className="p-1 border text-right text-xs">{pct(m.dept_fb)}</td>

                  {/* Dept Other */}
                  <td className="p-1 border bg-gray-100"><EditCell value={m.dept_other} onChange={(v) => updateField(idx, 'dept_other', v)} /></td>
                  <td className="p-1 border text-right text-xs">{perRN(m.dept_other)}</td>
                  <td className="p-1 border text-right text-xs">{pct(m.dept_other)}</td>

                  {/* Dept Profit */}
                  <td className="p-2 border text-right bg-yellow-50 font-semibold">{fmt(m.dept_profit)}</td>
                  <td className="p-1 border text-right bg-yellow-50 text-xs">{perRN(m.dept_profit)}</td>
                  <td className="p-1 border text-right bg-yellow-50 text-xs">{pct(m.dept_profit)}</td>

                  {/* Und AG */}
                  <td className="p-1 border bg-gray-100"><EditCell value={m.und_ag} onChange={(v) => updateField(idx, 'und_ag', v)} /></td>
                  <td className="p-1 border text-right text-xs">{perRN(m.und_ag)}</td>
                  <td className="p-1 border text-right text-xs">{pct(m.und_ag)}</td>

                  {/* Und IT */}
                  <td className="p-1 border bg-gray-100"><EditCell value={m.und_it} onChange={(v) => updateField(idx, 'und_it', v)} /></td>
                  <td className="p-1 border text-right text-xs">{perRN(m.und_it)}</td>
                  <td className="p-1 border text-right text-xs">{pct(m.und_it)}</td>

                  {/* Und SM */}
                  <td className="p-1 border bg-gray-100"><EditCell value={m.und_sm} onChange={(v) => updateField(idx, 'und_sm', v)} /></td>
                  <td className="p-1 border text-right text-xs">{perRN(m.und_sm)}</td>
                  <td className="p-1 border text-right text-xs">{pct(m.und_sm)}</td>

                  {/* Und POM */}
                  <td className="p-1 border bg-gray-100"><EditCell value={m.und_pom} onChange={(v) => updateField(idx, 'und_pom', v)} /></td>
                  <td className="p-1 border text-right text-xs">{perRN(m.und_pom)}</td>
                  <td className="p-1 border text-right text-xs">{pct(m.und_pom)}</td>

                  {/* Und EWW */}
                  <td className="p-1 border bg-gray-100"><EditCell value={m.und_eww} onChange={(v) => updateField(idx, 'und_eww', v)} /></td>
                  <td className="p-1 border text-right text-xs">{perRN(m.und_eww)}</td>
                  <td className="p-1 border text-right text-xs">{pct(m.und_eww)}</td>

                  {/* GOP */}
                  <td className="p-2 border text-right bg-green-50 font-semibold">{fmt(m.gop)}</td>
                  <td className="p-1 border text-right bg-green-50 text-xs">{perRN(m.gop)}</td>
                  <td className="p-1 border text-right bg-green-50 text-xs">{pct(m.gop)}</td>

                  {/* Fees Base */}
                  <td className="p-1 border bg-gray-100"><EditCell value={m.fees_base} onChange={(v) => updateField(idx, 'fees_base', v)} /></td>
                  <td className="p-1 border text-right text-xs">{perRN(m.fees_base)}</td>
                  <td className="p-1 border text-right text-xs">{pct(m.fees_base)}</td>

                  {/* Fees Var */}
                  <td className="p-1 border bg-gray-100"><EditCell value={m.fees_variable} onChange={(v) => updateField(idx, 'fees_variable', v)} /></td>
                  <td className="p-1 border text-right text-xs">{perRN(m.fees_variable)}</td>
                  <td className="p-1 border text-right text-xs">{pct(m.fees_variable)}</td>

                  {/* Fees Inc */}
                  <td className="p-1 border bg-gray-100"><EditCell value={m.fees_incentive} onChange={(v) => updateField(idx, 'fees_incentive', v)} /></td>
                  <td className="p-1 border text-right text-xs">{perRN(m.fees_incentive)}</td>
                  <td className="p-1 border text-right text-xs">{pct(m.fees_incentive)}</td>

                  {/* Fees Total */}
                  <td className="p-2 border text-right bg-pink-50 font-semibold">{fmt(m.fees_total)}</td>
                  <td className="p-1 border text-right bg-pink-50 text-xs">{perRN(m.fees_total)}</td>
                  <td className="p-1 border text-right bg-pink-50 text-xs">{pct(m.fees_total)}</td>

                  {/* Non-op */}
                  <td className="p-1 border bg-gray-100"><EditCell value={m.nonop_total} onChange={(v) => updateField(idx, 'nonop_total', v)} /></td>
                  <td className="p-1 border text-right text-xs">{perRN(m.nonop_total)}</td>
                  <td className="p-1 border text-right text-xs">{pct(m.nonop_total)}</td>

                  {/* EBITDA */}
                  <td className="p-2 border text-right bg-purple-50 font-semibold">{fmt(m.ebitda)}</td>
                  <td className="p-1 border text-right bg-purple-50 text-xs">{perRN(m.ebitda)}</td>
                  <td className="p-1 border text-right bg-purple-50 text-xs">{pct(m.ebitda)}</td>

                  {/* FF&E */}
                  <td className="p-1 border bg-gray-100"><EditCell value={m.ffe_amount} onChange={(v) => updateField(idx, 'ffe_amount', v)} /></td>
                  <td className="p-1 border text-right text-xs">{perRN(m.ffe_amount)}</td>
                  <td className="p-1 border text-right text-xs">{pct(m.ffe_amount)}</td>

                  {/* EBITDA-FF&E */}
                  <td className="p-2 border text-right bg-orange-50 font-semibold">{fmt(m.ebitda_less_ffe)}</td>
                  <td className="p-1 border text-right bg-orange-50 text-xs">{perRN(m.ebitda_less_ffe)}</td>
                  <td className="p-1 border text-right bg-orange-50 text-xs">{pct(m.ebitda_less_ffe)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Botón Guardar debajo de la tabla detallada */}
      <div className="flex justify-end">
        <button
          className="px-4 py-2 bg-black text-white rounded disabled:bg-gray-400"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Guardando...' : 'Guardar USALI Y1'}
        </button>
      </div>
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

function StatTriple({ label, value, totalRN, totalRev }: { label: string; value: number; totalRN: number; totalRev: number }) {
  const perRN = (value / Math.max(1, totalRN)).toFixed(2);
  const pct = ((value / Math.max(1, totalRev)) * 100).toFixed(1);

  return (
    <div className="text-center">
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <div className="text-lg font-semibold">
        {Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)}
      </div>
      <div className="text-xs text-gray-500 mt-1">
        €{perRN}/RN | {pct}%
      </div>
    </div>
  );
}

