import React from 'react';

// Días por mes (febrero con 28 días siempre)
const DIAS_MES = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export default function MonthlyTable({ rows, onChange, habitaciones }:{ rows:any[]; onChange:(r:any[])=>void; habitaciones:number }) {
  function upd(i:number, key:'ocupacion'|'adr', val:number) {
    const next = rows.slice();
    (next[i] as any)[key] = val;
    onChange(next);
  }

  const calcRoomnights = (mes: number, ocupacion: number) => {
    const dias = DIAS_MES[mes - 1] || 30;
    return habitaciones * dias * ocupacion;
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
            const ocupacion = r.ocupacion ?? r.occ ?? 0;
            const adr = r.adr ?? 0;
            const roomnights = calcRoomnights(r.mes, ocupacion);
            const roomsRev = calcRoomsRev(roomnights, adr);

            return (
              <tr key={r.mes} className="border-t">
                <td className="p-2 text-center">{r.mes}</td>
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
                    value={adr}
                    onChange={e=>upd(i,'adr', Number(e.target.value))}
                  />
                </td>
                <td className="p-2 text-center bg-blue-50 font-medium">
                  {Math.round(roomnights).toLocaleString('es-ES')}
                </td>
                <td className="p-2 text-right bg-green-50 font-medium">
                  {Math.round(roomsRev).toLocaleString('es-ES')}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
