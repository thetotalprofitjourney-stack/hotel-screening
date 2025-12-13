import React, { useState, useEffect } from 'react';
import NumericInput from './NumericInput';

interface AnnualData {
  anio: number;
  occupancy: number;
  rn: number;
  operating_revenue: number;
  dept_total: number;
  dept_profit: number;
  und_total: number;
  gop: number;
  fees: number;
  nonop: number;
  ebitda: number;
  ffe: number;
  ebitda_less_ffe: number;
  gop_margin: number;
  ebitda_margin: number;
  ebitda_less_ffe_margin: number;
}

interface AnnualUsaliTableProps {
  data: AnnualData[];
  editable?: boolean;
  onChange?: (data: AnnualData[]) => void;
}

export default function AnnualUsaliTable({ data, editable = false, onChange }: AnnualUsaliTableProps) {
  const [editableData, setEditableData] = useState<AnnualData[]>(data);

  useEffect(() => {
    setEditableData(data);
  }, [data]);

  // Función para actualizar un valor y recalcular campos derivados
  const updateValue = (anio: number, field: string, euroPerRN: number) => {
    const newData = editableData.map(row => {
      if (row.anio !== anio) return row;

      const updated = { ...row };
      const rn = row.rn || 1;

      // Actualizar el campo editado (convertir €/RN a € total)
      const euroTotal = euroPerRN * rn;

      switch (field) {
        case 'operating_revenue':
          updated.operating_revenue = euroTotal;
          break;
        case 'dept_total':
          updated.dept_total = euroTotal;
          break;
        case 'und_total':
          updated.und_total = euroTotal;
          break;
        case 'fees':
          updated.fees = euroTotal;
          break;
        case 'nonop':
          updated.nonop = euroTotal;
          break;
        case 'ffe':
          updated.ffe = euroTotal;
          break;
      }

      // Recalcular campos derivados
      updated.dept_profit = updated.operating_revenue - updated.dept_total;
      updated.gop = updated.dept_profit - updated.und_total;
      updated.ebitda = updated.gop - updated.fees - updated.nonop;
      updated.ebitda_less_ffe = updated.ebitda - updated.ffe;

      // Recalcular márgenes
      const totalRev = updated.operating_revenue || 1;
      updated.gop_margin = updated.gop / totalRev;
      updated.ebitda_margin = updated.ebitda / totalRev;
      updated.ebitda_less_ffe_margin = updated.ebitda_less_ffe / totalRev;

      return updated;
    });

    setEditableData(newData);
    onChange?.(newData);
  };

  const renderEditableCell = (row: AnnualData, field: string, value: number, bgClass: string = '') => {
    const euroPerRN = value / Math.max(1, row.rn);

    if (editable && row.anio >= 2) {
      return (
        <NumericInput
          value={euroPerRN}
          onChange={(val) => updateValue(row.anio, field, val)}
          decimals={2}
          className="w-20 px-1 py-0.5 text-right border rounded bg-red-50 text-red-600 font-medium"
        />
      );
    }

    return <span>{euroPerRN.toFixed(2)}</span>;
  };

  const renderMetricGroup = (
    label: string,
    row: AnnualData,
    euroValue: number,
    isEditable: boolean,
    field?: string,
    bgClass: string = ''
  ) => {
    const euroPerRN = euroValue / Math.max(1, row.rn);
    const pctTotalRev = (euroValue / Math.max(1, row.operating_revenue)) * 100;

    return (
      <td className={`border ${bgClass}`}>
        <div className="flex flex-col items-end text-xs p-1 space-y-0.5">
          <div className="font-semibold">{fmt(euroValue)}</div>
          <div className="text-gray-600">
            {isEditable && field && editable && row.anio >= 2 ? (
              renderEditableCell(row, field, euroValue, 'bg-yellow-50')
            ) : (
              <span>{euroPerRN.toFixed(2)} €/RN</span>
            )}
          </div>
          <div className="text-gray-500">{pctTotalRev.toFixed(1)}%</div>
        </div>
      </td>
    );
  };

  return (
    <div className="mt-5 space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold">
          Proyección USALI Anual (Años 1-{editableData.length})
        </h4>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border sticky left-0 bg-gray-100 z-10" rowSpan={2}>Año</th>
              <th className="p-2 border" rowSpan={2}>% Ocupación</th>
              <th className="p-2 border bg-blue-50" colSpan={1}>Total Rev</th>
              <th className="p-2 border bg-red-50" colSpan={1}>Dept Cost</th>
              <th className="p-2 border bg-yellow-50" colSpan={1}>Dept Profit</th>
              <th className="p-2 border bg-orange-50" colSpan={1}>Undistributed</th>
              <th className="p-2 border bg-green-50" colSpan={1}>GOP</th>
              <th className="p-2 border bg-indigo-50" colSpan={1}>FEES</th>
              <th className="p-2 border bg-pink-50" colSpan={1}>NON-OP</th>
              <th className="p-2 border bg-purple-50" colSpan={1}>EBITDA</th>
              <th className="p-2 border bg-gray-50" colSpan={1}>FF&E</th>
              <th className="p-2 border bg-teal-50" colSpan={1}>EBITDA-FF&E</th>
            </tr>
            <tr>
              <th className="p-1 border text-xs bg-blue-50">€ | €/RN | %</th>
              <th className="p-1 border text-xs bg-red-50">€ | €/RN | %</th>
              <th className="p-1 border text-xs bg-yellow-50">€ | €/RN | %</th>
              <th className="p-1 border text-xs bg-orange-50">€ | €/RN | %</th>
              <th className="p-1 border text-xs bg-green-50">€ | €/RN | %</th>
              <th className="p-1 border text-xs bg-indigo-50">€ | €/RN | %</th>
              <th className="p-1 border text-xs bg-pink-50">€ | €/RN | %</th>
              <th className="p-1 border text-xs bg-purple-50">€ | €/RN | %</th>
              <th className="p-1 border text-xs bg-gray-50">€ | €/RN | %</th>
              <th className="p-1 border text-xs bg-teal-50">€ | €/RN | %</th>
            </tr>
          </thead>
          <tbody>
            {editableData.map((row) => (
              <tr key={row.anio} className="hover:bg-gray-50">
                {/* Año */}
                <td className="p-2 border text-center font-medium sticky left-0 bg-white">
                  Año {row.anio}
                </td>

                {/* % Ocupación */}
                <td className="p-2 border text-center">
                  {(row.occupancy * 100).toFixed(1)}%
                </td>

                {/* Total Rev - Editable */}
                {renderMetricGroup('Total Rev', row, row.operating_revenue, true, 'operating_revenue', 'bg-blue-50')}

                {/* Dept Cost - Editable */}
                {renderMetricGroup('Dept Cost', row, row.dept_total, true, 'dept_total', 'bg-red-50')}

                {/* Dept Profit - Calculado */}
                {renderMetricGroup('Dept Profit', row, row.dept_profit, false, undefined, 'bg-yellow-50')}

                {/* Undistributed - Editable */}
                {renderMetricGroup('Undistributed', row, row.und_total, true, 'und_total', 'bg-orange-50')}

                {/* GOP - Calculado */}
                {renderMetricGroup('GOP', row, row.gop, false, undefined, 'bg-green-50')}

                {/* FEES - Editable */}
                {renderMetricGroup('FEES', row, row.fees, true, 'fees', 'bg-indigo-50')}

                {/* NON-OP - Editable */}
                {renderMetricGroup('NON-OP', row, row.nonop, true, 'nonop', 'bg-pink-50')}

                {/* EBITDA - Calculado */}
                {renderMetricGroup('EBITDA', row, row.ebitda, false, undefined, 'bg-purple-50')}

                {/* FF&E - Editable */}
                {renderMetricGroup('FF&E', row, row.ffe, true, 'ffe', 'bg-gray-50')}

                {/* EBITDA-FF&E - Calculado */}
                {renderMetricGroup('EBITDA-FF&E', row, row.ebitda_less_ffe, false, undefined, 'bg-teal-50')}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editable && (
        <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded border border-yellow-200">
          <strong>Nota:</strong> Los campos editables (Total Rev, Dept Cost, Undistributed, FEES, NON-OP, FF&E)
          se modifican en <strong>€/RN</strong>. Los campos calculados (Dept Profit, GOP, EBITDA, EBITDA-FF&E)
          se actualizan automáticamente.
        </div>
      )}
    </div>
  );
}

function fmt(n: number) {
  return Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(n ?? 0);
}
