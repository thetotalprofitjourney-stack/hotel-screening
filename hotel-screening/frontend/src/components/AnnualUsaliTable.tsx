import React, { useState } from 'react';

interface AnnualData {
  anio: number;
  rn: number; // Roomnights anuales
  operating_revenue: number;
  dept_profit: number;
  gop: number;
  ebitda: number;
  ffe: number;
  ebitda_less_ffe: number;
  gop_margin: number;
  ebitda_margin: number;
  ebitda_less_ffe_margin: number;
}

interface AnnualUsaliTableProps {
  data: AnnualData[];
}

export default function AnnualUsaliTable({ data }: AnnualUsaliTableProps) {
  const [showDetailed, setShowDetailed] = useState(false);

  return (
    <div className="mt-5 space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold">USALI Anual (Años 1-{data.length})</h4>
        <button
          className="px-3 py-2 border rounded text-sm"
          onClick={() => setShowDetailed(!showDetailed)}
        >
          {showDetailed ? 'Vista resumida' : 'Vista detallada'}
        </button>
      </div>

      {showDetailed ? (
        <div className="space-y-4">
          {/* Tabla de valores absolutos */}
          <div className="overflow-auto border rounded-lg">
            <h5 className="font-semibold p-3 bg-gray-100 border-b">Valores Absolutos (€)</h5>
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border text-left">Año</th>
                  <th className="p-2 border text-right bg-blue-50">Total Rev</th>
                  <th className="p-2 border text-right bg-yellow-50">Dept Profit</th>
                  <th className="p-2 border text-right bg-green-50">GOP</th>
                  <th className="p-2 border text-right bg-purple-50">EBITDA</th>
                  <th className="p-2 border text-right">FF&E</th>
                  <th className="p-2 border text-right bg-orange-50">EBITDA-FF&E</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.anio} className="border-t hover:bg-gray-50">
                    <td className="p-2 border text-center font-medium">Año {r.anio}</td>
                    <td className="p-2 border text-right bg-blue-50 font-semibold">{fmt(r.operating_revenue)}</td>
                    <td className="p-2 border text-right bg-yellow-50 font-semibold">{fmt(r.dept_profit)}</td>
                    <td className="p-2 border text-right bg-green-50 font-semibold">{fmt(r.gop)}</td>
                    <td className="p-2 border text-right bg-purple-50 font-semibold">{fmt(r.ebitda)}</td>
                    <td className="p-2 border text-right font-semibold">{fmt(r.ffe)}</td>
                    <td className="p-2 border text-right bg-orange-50 font-semibold">{fmt(r.ebitda_less_ffe)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tabla de % sobre Total Rev */}
          <div className="overflow-auto border rounded-lg">
            <h5 className="font-semibold p-3 bg-gray-100 border-b">% sobre Total Revenue</h5>
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border text-left">Año</th>
                  <th className="p-2 border text-right bg-yellow-50">Dept Profit %</th>
                  <th className="p-2 border text-right bg-green-50">GOP %</th>
                  <th className="p-2 border text-right bg-purple-50">EBITDA %</th>
                  <th className="p-2 border text-right">FF&E %</th>
                  <th className="p-2 border text-right bg-orange-50">EBITDA-FF&E %</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => {
                  const pct = (val: number) => ((val / r.operating_revenue) * 100).toFixed(1) + '%';
                  return (
                    <tr key={r.anio} className="border-t hover:bg-gray-50">
                      <td className="p-2 border text-center font-medium">Año {r.anio}</td>
                      <td className="p-2 border text-right bg-yellow-50">{pct(r.dept_profit)}</td>
                      <td className="p-2 border text-right bg-green-50">{pct(r.gop)}</td>
                      <td className="p-2 border text-right bg-purple-50">{pct(r.ebitda)}</td>
                      <td className="p-2 border text-right">{pct(r.ffe)}</td>
                      <td className="p-2 border text-right bg-orange-50">{pct(r.ebitda_less_ffe)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Tabla de € por Roomnight */}
          <div className="overflow-auto border rounded-lg">
            <h5 className="font-semibold p-3 bg-gray-100 border-b">€ por Roomnight</h5>
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border text-left">Año</th>
                  <th className="p-2 border text-right">Roomnights</th>
                  <th className="p-2 border text-right bg-blue-50">Total Rev €/RN</th>
                  <th className="p-2 border text-right bg-yellow-50">Dept Profit €/RN</th>
                  <th className="p-2 border text-right bg-green-50">GOP €/RN</th>
                  <th className="p-2 border text-right bg-purple-50">EBITDA €/RN</th>
                  <th className="p-2 border text-right">FF&E €/RN</th>
                  <th className="p-2 border text-right bg-orange-50">EBITDA-FF&E €/RN</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => {
                  const perRN = (val: number) => (val / Math.max(1, r.rn)).toFixed(2);
                  return (
                    <tr key={r.anio} className="border-t hover:bg-gray-50">
                      <td className="p-2 border text-center font-medium">Año {r.anio}</td>
                      <td className="p-2 border text-right font-semibold">{Math.round(r.rn).toLocaleString('es-ES')}</td>
                      <td className="p-2 border text-right bg-blue-50">{perRN(r.operating_revenue)}</td>
                      <td className="p-2 border text-right bg-yellow-50">{perRN(r.dept_profit)}</td>
                      <td className="p-2 border text-right bg-green-50">{perRN(r.gop)}</td>
                      <td className="p-2 border text-right bg-purple-50">{perRN(r.ebitda)}</td>
                      <td className="p-2 border text-right">{perRN(r.ffe)}</td>
                      <td className="p-2 border text-right bg-orange-50">{perRN(r.ebitda_less_ffe)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Vista resumida */
        <div className="overflow-auto border rounded-lg">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Año</th>
                <th className="p-2 border bg-blue-50">Total Rev</th>
                <th className="p-2 border bg-yellow-50">Dept Profit</th>
                <th className="p-2 border bg-green-50">GOP</th>
                <th className="p-2 border bg-purple-50">EBITDA</th>
                <th className="p-2 border">FF&E</th>
                <th className="p-2 border bg-orange-50">EBITDA-FF&E</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.anio} className="border-t hover:bg-gray-50">
                  <td className="p-2 border text-center font-medium">Año {r.anio}</td>
                  <td className="p-2 border text-right bg-blue-50 font-semibold">{fmt(r.operating_revenue)}</td>
                  <td className="p-2 border text-right bg-yellow-50 font-semibold">{fmt(r.dept_profit)}</td>
                  <td className="p-2 border text-right bg-green-50 font-semibold">{fmt(r.gop)}</td>
                  <td className="p-2 border text-right bg-purple-50 font-semibold">{fmt(r.ebitda)}</td>
                  <td className="p-2 border text-right font-semibold">{fmt(r.ffe)}</td>
                  <td className="p-2 border text-right bg-orange-50 font-semibold">{fmt(r.ebitda_less_ffe)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function fmt(n: number) {
  return Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n ?? 0);
}
