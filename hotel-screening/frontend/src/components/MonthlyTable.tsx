import React from 'react';

// Días por mes (febrero con 28 días fijos)
const DAYS_PER_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export default function MonthlyTable({ rows, onChange, habitaciones }:{ rows:any[]; onChange:(r:any[])=>void; habitaciones:number }) {
  function upd(i:number, key:'ocupacion'|'adr', val:number) {
    const next = rows.slice();
    (next[i] as any)[key] = val;
    onChange(next);
  }

  // Calcular Roomnights y Rooms Rev para cada mes
  const calcRoomnights = (mesIndex: number, ocupacion: number) => {
    const days = DAYS_PER_MONTH[mesIndex];
    return Math.round(habitaciones * days * ocupacion);
  };

  const calcRoomsRev = (roomnights: number, adr: number) => {
    return roomnights * adr;
  };

  return (
    <div className="overflow-auto">
      <table className="w-full border text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-2">Mes</th>
            <th className="p-2">Ocupación</th>
            <th className="p-2">ADR (€)</th>
            <th className="p-2 bg-blue-50">Roomnights</th>
            <th className="p-2 bg-green-50">Rooms Rev (€)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r,i)=>{
            const ocupacion = r.ocupacion ?? r.occ;
            const roomnights = calcRoomnights(i, ocupacion);
            const roomsRev = calcRoomsRev(roomnights, r.adr);

            return (
              <tr key={r.mes} className="border-t">
                <td className="p-2 text-center font-medium">{r.mes}</td>
                <td className="p-2 text-center">
                  <input className="w-24 border px-2 py-1 rounded text-right"
                    type="number" min={0} max={1} step={0.01}
                    value={ocupacion}
                    onChange={e=>upd(i,'ocupacion', Number(e.target.value))}
                  />
                </td>
                <td className="p-2 text-center">
                  <input className="w-28 border px-2 py-1 rounded text-right"
                    type="number" min={0} step={1}
                    value={r.adr}
                    onChange={e=>upd(i,'adr', Number(e.target.value))}
                  />
                </td>
                <td className="p-2 text-right bg-blue-50 font-semibold">
                  {roomnights.toLocaleString('es-ES')}
                </td>
                <td className="p-2 text-right bg-green-50 font-semibold">
                  {roomsRev.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
