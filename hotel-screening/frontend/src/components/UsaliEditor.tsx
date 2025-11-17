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
  const [showDetailed, setShowDetailed] = useState(false);
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
        <div className="space-y-4">
          {/* Tabla de valores absolutos (editables) */}
          <div className="overflow-auto border rounded-lg">
            <h5 className="font-semibold p-3 bg-gray-100 border-b">Valores Absolutos (€)</h5>
            <table className="w-full text-xs border-collapse">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="p-2 border text-left">Mes</th>
                  <th className="p-2 border text-right">Rooms Rev</th>
                  <th className="p-2 border text-right">F&B Rev</th>
                  <th className="p-2 border text-right">Other Op</th>
                  <th className="p-2 border text-right">Misc</th>
                  <th className="p-2 border text-right bg-blue-50">Total Rev</th>
                  <th className="p-2 border text-right">Dept Rooms</th>
                  <th className="p-2 border text-right">Dept F&B</th>
                  <th className="p-2 border text-right">Dept Other</th>
                  <th className="p-2 border text-right bg-yellow-50">Dept Profit</th>
                  <th className="p-2 border text-right">Und AG</th>
                  <th className="p-2 border text-right">Und IT</th>
                  <th className="p-2 border text-right">Und SM</th>
                  <th className="p-2 border text-right">Und POM</th>
                  <th className="p-2 border text-right">Und EWW</th>
                  <th className="p-2 border text-right bg-green-50">GOP</th>
                  <th className="p-2 border text-right">Fees Base</th>
                  <th className="p-2 border text-right">Fees Var</th>
                  <th className="p-2 border text-right">Fees Inc</th>
                  <th className="p-2 border text-right">Non-op</th>
                  <th className="p-2 border text-right bg-purple-50">EBITDA</th>
                  <th className="p-2 border text-right">FF&E</th>
                  <th className="p-2 border text-right bg-orange-50">EBITDA-FF&E</th>
                </tr>
              </thead>
              <tbody>
                {data.map((m, idx) => (
                  <tr key={m.mes} className="hover:bg-gray-50">
                    <td className="p-2 border text-center font-medium">{m.mes}</td>
                    <td className="p-1 border"><EditCell value={m.rooms} onChange={(v) => updateField(idx, 'rooms', v)} /></td>
                    <td className="p-1 border"><EditCell value={m.fb} onChange={(v) => updateField(idx, 'fb', v)} /></td>
                    <td className="p-1 border"><EditCell value={m.other_operated} onChange={(v) => updateField(idx, 'other_operated', v)} /></td>
                    <td className="p-1 border"><EditCell value={m.misc_income} onChange={(v) => updateField(idx, 'misc_income', v)} /></td>
                    <td className="p-2 border text-right bg-blue-50 font-semibold">{fmt(m.total_rev)}</td>
                    <td className="p-1 border"><EditCell value={m.dept_rooms} onChange={(v) => updateField(idx, 'dept_rooms', v)} /></td>
                    <td className="p-1 border"><EditCell value={m.dept_fb} onChange={(v) => updateField(idx, 'dept_fb', v)} /></td>
                    <td className="p-1 border"><EditCell value={m.dept_other} onChange={(v) => updateField(idx, 'dept_other', v)} /></td>
                    <td className="p-2 border text-right bg-yellow-50 font-semibold">{fmt(m.dept_profit)}</td>
                    <td className="p-1 border"><EditCell value={m.und_ag} onChange={(v) => updateField(idx, 'und_ag', v)} /></td>
                    <td className="p-1 border"><EditCell value={m.und_it} onChange={(v) => updateField(idx, 'und_it', v)} /></td>
                    <td className="p-1 border"><EditCell value={m.und_sm} onChange={(v) => updateField(idx, 'und_sm', v)} /></td>
                    <td className="p-1 border"><EditCell value={m.und_pom} onChange={(v) => updateField(idx, 'und_pom', v)} /></td>
                    <td className="p-1 border"><EditCell value={m.und_eww} onChange={(v) => updateField(idx, 'und_eww', v)} /></td>
                    <td className="p-2 border text-right bg-green-50 font-semibold">{fmt(m.gop)}</td>
                    <td className="p-1 border"><EditCell value={m.fees_base} onChange={(v) => updateField(idx, 'fees_base', v)} /></td>
                    <td className="p-1 border"><EditCell value={m.fees_variable} onChange={(v) => updateField(idx, 'fees_variable', v)} /></td>
                    <td className="p-1 border"><EditCell value={m.fees_incentive} onChange={(v) => updateField(idx, 'fees_incentive', v)} /></td>
                    <td className="p-1 border"><EditCell value={m.nonop_total} onChange={(v) => updateField(idx, 'nonop_total', v)} /></td>
                    <td className="p-2 border text-right bg-purple-50 font-semibold">{fmt(m.ebitda)}</td>
                    <td className="p-1 border"><EditCell value={m.ffe_amount} onChange={(v) => updateField(idx, 'ffe_amount', v)} /></td>
                    <td className="p-2 border text-right bg-orange-50 font-semibold">{fmt(m.ebitda_less_ffe)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tabla de % sobre Total Rev (no editable) */}
          <div className="overflow-auto border rounded-lg">
            <h5 className="font-semibold p-3 bg-gray-100 border-b">% sobre Total Revenue</h5>
            <table className="w-full text-xs border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border text-left">Mes</th>
                  <th className="p-2 border text-right">Rooms %</th>
                  <th className="p-2 border text-right">F&B %</th>
                  <th className="p-2 border text-right">Other %</th>
                  <th className="p-2 border text-right">Misc %</th>
                  <th className="p-2 border text-right">Dept Rooms %</th>
                  <th className="p-2 border text-right">Dept F&B %</th>
                  <th className="p-2 border text-right">Dept Other %</th>
                  <th className="p-2 border text-right bg-yellow-50">Dept Profit %</th>
                  <th className="p-2 border text-right">Und Total %</th>
                  <th className="p-2 border text-right bg-green-50">GOP %</th>
                  <th className="p-2 border text-right">Fees %</th>
                  <th className="p-2 border text-right">Non-op %</th>
                  <th className="p-2 border text-right bg-purple-50">EBITDA %</th>
                  <th className="p-2 border text-right">FF&E %</th>
                  <th className="p-2 border text-right bg-orange-50">EBITDA-FF&E %</th>
                </tr>
              </thead>
              <tbody>
                {data.map((m) => {
                  const pct = (val: number) => ((val / m.total_rev) * 100).toFixed(1) + '%';
                  return (
                    <tr key={m.mes} className="hover:bg-gray-50">
                      <td className="p-2 border text-center font-medium">{m.mes}</td>
                      <td className="p-2 border text-right">{pct(m.rooms)}</td>
                      <td className="p-2 border text-right">{pct(m.fb)}</td>
                      <td className="p-2 border text-right">{pct(m.other_operated)}</td>
                      <td className="p-2 border text-right">{pct(m.misc_income)}</td>
                      <td className="p-2 border text-right">{pct(m.dept_rooms)}</td>
                      <td className="p-2 border text-right">{pct(m.dept_fb)}</td>
                      <td className="p-2 border text-right">{pct(m.dept_other)}</td>
                      <td className="p-2 border text-right bg-yellow-50 font-semibold">{pct(m.dept_profit)}</td>
                      <td className="p-2 border text-right">{pct(m.und_total)}</td>
                      <td className="p-2 border text-right bg-green-50 font-semibold">{pct(m.gop)}</td>
                      <td className="p-2 border text-right">{pct(m.fees_total)}</td>
                      <td className="p-2 border text-right">{pct(m.nonop_total)}</td>
                      <td className="p-2 border text-right bg-purple-50 font-semibold">{pct(m.ebitda)}</td>
                      <td className="p-2 border text-right">{pct(m.ffe_amount)}</td>
                      <td className="p-2 border text-right bg-orange-50 font-semibold">{pct(m.ebitda_less_ffe)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Tabla de € por Roomnight (no editable) */}
          <div className="overflow-auto border rounded-lg">
            <h5 className="font-semibold p-3 bg-gray-100 border-b">€ por Roomnight</h5>
            <table className="w-full text-xs border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border text-left">Mes</th>
                  <th className="p-2 border text-right">Roomnights</th>
                  <th className="p-2 border text-right">Rooms €/RN</th>
                  <th className="p-2 border text-right">F&B €/RN</th>
                  <th className="p-2 border text-right">Other €/RN</th>
                  <th className="p-2 border text-right">Misc €/RN</th>
                  <th className="p-2 border text-right bg-blue-50">Total Rev €/RN</th>
                  <th className="p-2 border text-right">Dept Rooms €/RN</th>
                  <th className="p-2 border text-right bg-yellow-50">Dept Profit €/RN</th>
                  <th className="p-2 border text-right">Und €/RN</th>
                  <th className="p-2 border text-right bg-green-50">GOP €/RN</th>
                  <th className="p-2 border text-right">Fees €/RN</th>
                  <th className="p-2 border text-right">Non-op €/RN</th>
                  <th className="p-2 border text-right bg-purple-50">EBITDA €/RN</th>
                  <th className="p-2 border text-right">FF&E €/RN</th>
                  <th className="p-2 border text-right bg-orange-50">EBITDA-FF&E €/RN</th>
                </tr>
              </thead>
              <tbody>
                {data.map((m) => {
                  const perRN = (val: number) => (val / Math.max(1, m.rn)).toFixed(2);
                  return (
                    <tr key={m.mes} className="hover:bg-gray-50">
                      <td className="p-2 border text-center font-medium">{m.mes}</td>
                      <td className="p-2 border text-right font-semibold">{m.rn.toLocaleString('es-ES')}</td>
                      <td className="p-2 border text-right">{perRN(m.rooms)}</td>
                      <td className="p-2 border text-right">{perRN(m.fb)}</td>
                      <td className="p-2 border text-right">{perRN(m.other_operated)}</td>
                      <td className="p-2 border text-right">{perRN(m.misc_income)}</td>
                      <td className="p-2 border text-right bg-blue-50 font-semibold">{perRN(m.total_rev)}</td>
                      <td className="p-2 border text-right">{perRN(m.dept_rooms)}</td>
                      <td className="p-2 border text-right bg-yellow-50 font-semibold">{perRN(m.dept_profit)}</td>
                      <td className="p-2 border text-right">{perRN(m.und_total)}</td>
                      <td className="p-2 border text-right bg-green-50 font-semibold">{perRN(m.gop)}</td>
                      <td className="p-2 border text-right">{perRN(m.fees_total)}</td>
                      <td className="p-2 border text-right">{perRN(m.nonop_total)}</td>
                      <td className="p-2 border text-right bg-purple-50 font-semibold">{perRN(m.ebitda)}</td>
                      <td className="p-2 border text-right">{perRN(m.ffe_amount)}</td>
                      <td className="p-2 border text-right bg-orange-50 font-semibold">{perRN(m.ebitda_less_ffe)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
                  <td className="p-2 border text-right font-semibold">{fmt(m.ffe_amount)}</td>
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

