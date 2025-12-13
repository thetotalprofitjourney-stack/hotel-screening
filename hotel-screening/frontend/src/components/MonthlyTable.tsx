import React from 'react';

// Función para obtener días exactos de un mes considerando años bisiestos
const getDaysInMonth = (month: number, year: number = new Date().getFullYear()): number => {
  // month: 1-12
  return new Date(year, month, 0).getDate();
};

export default function MonthlyTable({ rows, onChange, habitaciones }:{ rows:any[]; onChange:(r:any[])=>void; habitaciones:number }) {
  const currentYear = new Date().getFullYear();

  function upd(i:number, key:'occ'|'adr'|'dias', val:number) {
    const next = rows.slice();
    // Si es ocupación, convertir de porcentaje entero (0-100) a decimal (0-1)
    if (key === 'occ') {
      (next[i] as any)[key] = val / 100;
    } else {
      (next[i] as any)[key] = val;
    }
    onChange(next);
  }

  // Normalizar ocupación: siempre debe ser un valor decimal entre 0 y 1
  const normalizeOcc = (occ: number): number => {
    if (typeof occ !== 'number' || isNaN(occ)) return 0;
    // Si el valor es mayor a 1, probablemente está en formato porcentual (ej: 81)
    // Si es menor o igual a 1, está en formato decimal (ej: 0.81)
    return occ > 1 ? occ / 100 : occ;
  };

  // Calcular Roomnights y Rooms Rev para cada mes
  const calcRoomnights = (dias: number, ocupacion: number) => {
    return Math.round(habitaciones * dias * ocupacion);
  };

  const calcRoomsRev = (roomnights: number, adr: number) => {
    return roomnights * adr;
  };

  const calcRevPAR = (ocupacion: number, adr: number) => {
    return ocupacion * adr;
  };

  // Calcular KPIs anuales
  const calcAnnualKPIs = () => {
    let totalRoomnights = 0;
    let totalRoomsRev = 0;
    let totalAvailableRooms = 0;

    rows.forEach((r) => {
      const ocupacion = normalizeOcc(r.occ);
      const dias = r.dias || getDaysInMonth(r.mes || 1, currentYear);
      const roomnights = calcRoomnights(dias, ocupacion);
      const roomsRev = calcRoomsRev(roomnights, r.adr);
      const availableRooms = habitaciones * dias;

      totalRoomnights += roomnights;
      totalRoomsRev += roomsRev;
      totalAvailableRooms += availableRooms;
    });

    // Ocupación anual = sumatorio de Roomnights / sumatorio de habitaciones disponibles del año
    const occAnual = totalAvailableRooms > 0 ? totalRoomnights / totalAvailableRooms : 0;
    // ADR anual = Rooms Rev anualizado / Roomnights anualizadas
    const adrAnual = totalRoomnights > 0 ? totalRoomsRev / totalRoomnights : 0;
    // RevPAR anual = ocupación anual * ADR anual
    const revparAnual = occAnual * adrAnual;

    return {
      ocupacion: occAnual,
      adr: adrAnual,
      roomnights: totalRoomnights,
      roomsRev: totalRoomsRev,
      revpar: revparAnual
    };
  };

  const annual = calcAnnualKPIs();

  return (
    <div className="space-y-4">
      {/* KPIs Anuales */}
      <div className="grid grid-cols-5 gap-3 p-4 bg-gray-50 rounded-lg">
        <Stat label="Ocupación" value={`${(annual.ocupacion * 100).toFixed(1)}%`} />
        <Stat label="ADR" value={fmt(annual.adr)} />
        <Stat label="Roomnights" value={annual.roomnights.toLocaleString('es-ES')} />
        <Stat label="Rooms Rev" value={fmt(annual.roomsRev)} />
        <Stat label="RevPAR" value={fmt(annual.revpar)} />
      </div>

      {/* Tabla Mensual */}
      <div className="overflow-auto">
        <table className="w-full border text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2">Mes</th>
              <th className="p-2">Días</th>
              <th className="p-2">Ocupación</th>
              <th className="p-2">ADR (€)</th>
              <th className="p-2 bg-blue-50">Roomnights</th>
              <th className="p-2 bg-green-50">Rooms Rev (€)</th>
              <th className="p-2 bg-purple-50">RevPAR (€)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i)=>{
              // Normalizar ocupación a decimal (0-1) independientemente del formato de entrada
              const ocupacion = normalizeOcc(r.occ);
              const dias = r.dias || getDaysInMonth(r.mes || (i + 1), currentYear);
              const roomnights = calcRoomnights(dias, ocupacion);
              const roomsRev = calcRoomsRev(roomnights, r.adr);
              const revpar = calcRevPAR(ocupacion, r.adr);

              return (
                <tr key={r.mes} className="border-t">
                  <td className="p-2 text-center font-medium">{r.mes}</td>
                  <td className="p-2 text-center">
                    <input className="w-16 border px-2 py-1 rounded text-right"
                      type="number" min={1} max={31} step={1}
                      value={dias}
                      onChange={e=>upd(i,'dias', Number(e.target.value))}
                      onFocus={e => e.target.select()}
                    />
                  </td>
                  <td className="p-2 text-center">
                    <input className="w-24 border px-2 py-1 rounded text-right"
                      type="number" step="any"
                      value={ocupacion * 100}
                      onChange={e=>upd(i,'occ', Number(e.target.value))}
                      onFocus={e => e.target.select()}
                    />
                  </td>
                  <td className="p-2 text-center">
                    <input className="w-28 border px-2 py-1 rounded text-right"
                      type="number" min={0} step={1}
                      value={r.adr}
                      onChange={e=>upd(i,'adr', Number(e.target.value))}
                      onFocus={e => e.target.select()}
                    />
                  </td>
                  <td className="p-2 text-right bg-blue-50 font-semibold">
                    {roomnights.toLocaleString('es-ES')}
                  </td>
                  <td className="p-2 text-right bg-green-50 font-semibold">
                    {roomsRev.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                  </td>
                  <td className="p-2 text-right bg-purple-50 font-semibold">
                    {revpar.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function fmt(n: number) {
  return Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n ?? 0);
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <div className="text-lg font-semibold">
        {typeof value === 'string' ? value : value.toLocaleString('es-ES')}
      </div>
    </div>
  );
}
