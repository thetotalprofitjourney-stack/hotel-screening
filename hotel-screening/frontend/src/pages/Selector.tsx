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

const SEGMENTOS = ['urbano', 'vacacional'];
const CATEGORIAS = ['economy', 'midscale', 'upper_midscale', 'upscale', 'upper_upscale', 'luxury'];

export default function Selector({ onOpen, onBack }:{ onOpen:(id:string)=>void; onBack:()=>void }) {
  const [sort, setSort] = useState('irr_levered');
  const [order, setOrder] = useState<'asc'|'desc'>('desc');
  const [rows, setRows] = useState<any[]>([]);
  const [allRows, setAllRows] = useState<any[]>([]);

  // Filtros
  const [selectedSegmentos, setSelectedSegmentos] = useState<string[]>([]);
  const [selectedCategorias, setSelectedCategorias] = useState<string[]>([]);
  const [irrMin, setIrrMin] = useState<number | null>(null);
  const [irrMax, setIrrMax] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  async function load() {
    const data = await api(`/v1/selector?sort=${sort}&order=${order}`);
    setAllRows(data.rows);
    applyFilters(data.rows);
  }

  useEffect(()=>{ load().catch(console.error); }, [sort, order]);

  const applyFilters = (dataRows: any[] = allRows) => {
    let filtered = [...dataRows];

    // Filtro por segmento
    if (selectedSegmentos.length > 0) {
      filtered = filtered.filter(r => selectedSegmentos.includes(r.segmento));
    }

    // Filtro por categoría
    if (selectedCategorias.length > 0) {
      filtered = filtered.filter(r => selectedCategorias.includes(r.categoria));
    }

    // Filtro por rango de IRR
    if (irrMin !== null) {
      filtered = filtered.filter(r => r.irr_levered !== null && r.irr_levered >= irrMin / 100);
    }
    if (irrMax !== null) {
      filtered = filtered.filter(r => r.irr_levered !== null && r.irr_levered <= irrMax / 100);
    }

    setRows(filtered);
  };

  useEffect(() => {
    applyFilters();
  }, [selectedSegmentos, selectedCategorias, irrMin, irrMax, allRows]);

  const toggleSegmento = (seg: string) => {
    setSelectedSegmentos(prev =>
      prev.includes(seg) ? prev.filter(s => s !== seg) : [...prev, seg]
    );
  };

  const toggleCategoria = (cat: string) => {
    setSelectedCategorias(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const clearFilters = () => {
    setSelectedSegmentos([]);
    setSelectedCategorias([]);
    setIrrMin(null);
    setIrrMax(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button className="px-2 py-1 border rounded hover:bg-gray-50" onClick={onBack}>← Volver</button>
          <h2 className="text-xl font-semibold">Selector de oportunidades</h2>
        </div>
        <div className="flex gap-2 items-center">
          <button
            className={`px-3 py-2 border rounded ${showFilters ? 'bg-blue-100 border-blue-500' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
          </button>
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

      {/* Panel de filtros */}
      {showFilters && (
        <div className="mb-4 p-4 border rounded-lg bg-gray-50">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">Filtros</h3>
            <button
              className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
              onClick={clearFilters}
            >
              Limpiar filtros
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Filtro por segmento */}
            <div>
              <label className="block text-sm font-medium mb-2">Segmento</label>
              <div className="space-y-1">
                {SEGMENTOS.map(seg => (
                  <label key={seg} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSegmentos.includes(seg)}
                      onChange={() => toggleSegmento(seg)}
                      className="rounded"
                    />
                    <span className="text-sm capitalize">{seg}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filtro por categoría */}
            <div>
              <label className="block text-sm font-medium mb-2">Categoría</label>
              <div className="space-y-1">
                {CATEGORIAS.map(cat => (
                  <label key={cat} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCategorias.includes(cat)}
                      onChange={() => toggleCategoria(cat)}
                      className="rounded"
                    />
                    <span className="text-sm capitalize">{cat.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filtro por rango de IRR */}
            <div>
              <label className="block text-sm font-medium mb-2">Rango de IRR Levered (%)</label>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-600">Mínimo</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ej: 10"
                    value={irrMin ?? ''}
                    onChange={e => setIrrMin(e.target.value ? parseFloat(e.target.value) : null)}
                    className="w-full border px-2 py-1 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Máximo</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ej: 20"
                    value={irrMax ?? ''}
                    onChange={e => setIrrMax(e.target.value ? parseFloat(e.target.value) : null)}
                    className="w-full border px-2 py-1 rounded text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Resumen de filtros activos */}
          {(selectedSegmentos.length > 0 || selectedCategorias.length > 0 || irrMin !== null || irrMax !== null) && (
            <div className="mt-3 pt-3 border-t text-sm">
              <strong>Filtros activos:</strong>{' '}
              {selectedSegmentos.length > 0 && <span className="text-blue-600">Segmentos: {selectedSegmentos.join(', ')} </span>}
              {selectedCategorias.length > 0 && <span className="text-green-600">Categorías: {selectedCategorias.join(', ')} </span>}
              {(irrMin !== null || irrMax !== null) && (
                <span className="text-purple-600">
                  IRR: {irrMin ?? '-∞'}% - {irrMax ?? '+∞'}%
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mb-2 text-sm text-gray-600">
        Mostrando {rows.length} de {allRows.length} proyectos
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
              <tr key={r.project_id} className="border-t hover:bg-gray-50">
                <td className="p-2 text-left">{r.nombre}</td>
                <td className="p-2 text-center text-xs">{r.comunidad_autonoma} - {r.provincia} - {r.zona}</td>
                <td className="p-2 text-center capitalize">{r.segmento}</td>
                <td className="p-2 text-center capitalize text-xs">{r.categoria?.replace('_', ' ')}</td>
                <td className="p-2 text-right">{r.habitaciones}</td>
                <td className="p-2 text-right">{fmt(r.price_per_key)}</td>
                <td className="p-2 text-right">{pct(r.y1_noi_cap_rate)}</td>
                <td className="p-2 text-right">{pct(r.y1_yield_on_cost)}</td>
                <td className="p-2 text-right">{r.y1_dscr ? fmtDecimal(r.y1_dscr, 2) : '—'}</td>
                <td className="p-2 text-right">{r.irr_levered!=null ? pct(r.irr_levered) : '—'}</td>
                <td className="p-2 text-center">
                  <button className="px-2 py-1 border rounded hover:bg-gray-100" onClick={()=>onOpen(r.project_id)}>Abrir</button>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td className="p-4 text-center text-gray-500" colSpan={11}>{allRows.length > 0 ? 'Ningún proyecto coincide con los filtros seleccionados' : 'Sin datos (calcula Y1 / proyección / deuda / valoración)'}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function fmt(n:number) {
  if (n == null) return '—';
  const rounded = Math.round(n);
  const str = Math.abs(rounded).toString();
  const parts = [];
  for (let i = str.length; i > 0; i -= 3) {
    const start = Math.max(0, i - 3);
    parts.unshift(str.substring(start, i));
  }
  const formatted = parts.join('.');
  return rounded < 0 ? '-' + formatted : formatted;
}
function pct(n:number){ return n!=null ? (n*100).toFixed(1)+'%' : '—'; }
