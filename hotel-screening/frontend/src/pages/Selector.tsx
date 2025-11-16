import React, { useEffect, useState } from 'react';
import { api } from '../api';

const OPTS = [
  { key:'irr_levered', label:'IRR levered' },
  { key:'y1_yield_on_cost', label:'Yield on Cost Y1' },
  { key:'y1_dscr', label:'DSCR Y1' },
  { key:'y1_noi_cap_rate', label:'Cap Rate Y1' },
  { key:'price_per_key', label:'Price/Key' },
  { key:'y1_ebitda_margin', label:'EBITDA% Y1' },
  { key:'y1_operating_revenue', label:'Ingresos Y1' }
];

export default function Selector({ onOpen }:{ onOpen:(id:string)=>void }) {
  const [sort, setSort] = useState('irr_levered');
  const [order, setOrder] = useState<'asc'|'desc'>('desc');
  const [rows, setRows] = useState<any[]>([]);

  async function load() {
    const data = await api(`/v1/selector?sort=${sort}&order=${order}`);
    setRows(data.rows);
  }
  useEffect(()=>{ load().catch(console.error); }, [sort, order]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Selector de oportunidades</h2>
        <div className="flex gap-2 items-center">
          <select className="border px-2 py-1 rounded" value={sort} onChange={e=>setSort(e.target.value)}>
            {OPTS.map(o=> <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
          <select className="border px-2 py-1 rounded" value={order} onChange={e=>setOrder(e.target.value as any)}>
            <option value="desc">↓ Desc</option>
            <option value="asc">↑ Asc</option>
          </select>
          <button className="px-3 py-2 border rounded" onClick={load}>Actualizar</button>
        </div>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-sm border">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Proyecto</th>
              <th className="p-2">Ubicación</th>
              <th className="p-2">Segm</th>
              <th className="p-2">Cat</th>
              <th className="p-2">Keys</th>
              <th className="p-2">Price/Key</th>
              <th className="p-2">Cap Rate Y1</th>
              <th className="p-2">Yield on Cost Y1</th>
              <th className="p-2">DSCR Y1</th>
              <th className="p-2">IRR lev.</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.project_id} className="border-t">
                <td className="p-2 text-left">{r.nombre}</td>
                <td className="p-2 text-center">{r.ubicacion}</td>
                <td className="p-2 text-center">{r.segmento}</td>
                <td className="p-2 text-center">{r.categoria}</td>
                <td className="p-2 text-right">{r.habitaciones}</td>
                <td className="p-2 text-right">{fmt(r.price_per_key)}</td>
                <td className="p-2 text-right">{pct(r.y1_noi_cap_rate)}</td>
                <td className="p-2 text-right">{pct(r.y1_yield_on_cost)}</td>
                <td className="p-2 text-right">{r.y1_dscr ? r.y1_dscr.toFixed(2) : '—'}</td>
                <td className="p-2 text-right">{r.irr_levered!=null ? (r.irr_levered*100).toFixed(1)+'%' : '—'}</td>
                <td className="p-2 text-center">
                  <button className="px-2 py-1 border rounded" onClick={()=>onOpen(r.project_id)}>Abrir</button>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td className="p-4 text-center text-gray-500" colSpan={11}>Sin datos (calcula Y1 / proyección / deuda / valoración)</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function fmt(n:number){ return n!=null ? Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(n) : '—'; }
function pct(n:number){ return n!=null ? (n*100).toFixed(1)+'%' : '—'; }
