import React from 'react';

export default function MonthlyTable({ rows, onChange }:{ rows:any[]; onChange:(r:any[])=>void }) {
  function upd(i:number, key:'ocupacion'|'adr', val:number) {
    const next = rows.slice();
    (next[i] as any)[key] = val;
    onChange(next);
  }
  return (
    <div className="overflow-auto">
      <table className="w-full border text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-2">Mes</th>
            <th className="p-2">Ocupación</th>
            <th className="p-2">ADR (€)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r,i)=>(
            <tr key={r.mes} className="border-t">
              <td className="p-2 text-center">{r.mes}</td>
              <td className="p-2 text-center">
                <input className="w-24 border px-2 py-1 rounded text-right"
                  type="number" min={0} max={1} step={0.01}
                  value={r.ocupacion ?? r.occ}
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
