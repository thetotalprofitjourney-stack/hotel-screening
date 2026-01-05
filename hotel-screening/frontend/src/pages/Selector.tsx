import React, { useEffect, useState } from 'react';
import { api } from '../api';

// Función de formateo de números (formato español)
function fmtDecimal(n: number, decimals: number = 2) {
  return n.toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

const OPTS = [
  { key:'irr_levered', label:'IRR levered' },
  { key:'moic_levered', label:'MOIC levered' },
  { key:'price_per_key', label:'Price/Key' },
  { key:'y1_ebitda_margin', label:'EBITDA% Y1' },
  { key:'y1_operating_revenue', label:'Ingresos Y1' },
  { key:'total_fees', label:'FEES (€)' },
  { key:'fees_per_key', label:'FEES (€/key)' }
];

const SEGMENTOS = ['urbano', 'vacacional'];
const CATEGORIAS = ['economy', 'midscale', 'upper_midscale', 'upscale', 'upper_upscale', 'luxury'];
const PROJECT_TYPES = [
  { key: 'operador', label: 'Operador' },
  { key: 'inversión', label: 'Inversión/Banco' }
];

export default function Selector({ onOpen, onBack }:{ onOpen:(id:string)=>void; onBack:()=>void }) {
  const [sort, setSort] = useState('irr_levered');
  const [order, setOrder] = useState<'asc'|'desc'>('desc');
  const [rows, setRows] = useState<any[]>([]);
  const [allRows, setAllRows] = useState<any[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Filtros
  const [selectedSegmentos, setSelectedSegmentos] = useState<string[]>([]);
  const [selectedCategorias, setSelectedCategorias] = useState<string[]>([]);
  const [selectedProjectTypes, setSelectedProjectTypes] = useState<string[]>([]);
  const [irrMin, setIrrMin] = useState<number | null>(null);
  const [irrMax, setIrrMax] = useState<number | null>(null);
  const [fechaMin, setFechaMin] = useState<string>('');
  const [fechaMax, setFechaMax] = useState<string>('');
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

    // Filtro por tipo de proyecto
    if (selectedProjectTypes.length > 0) {
      filtered = filtered.filter(r => r.project_type && selectedProjectTypes.includes(r.project_type));
    }

    // Filtro por rango de IRR
    if (irrMin !== null) {
      filtered = filtered.filter(r => r.irr_levered !== null && r.irr_levered >= irrMin / 100);
    }
    if (irrMax !== null) {
      filtered = filtered.filter(r => r.irr_levered !== null && r.irr_levered <= irrMax / 100);
    }

    // Filtro por rango de fecha
    if (fechaMin) {
      const minDate = new Date(fechaMin);
      filtered = filtered.filter(r => r.created_at && new Date(r.created_at) >= minDate);
    }
    if (fechaMax) {
      const maxDate = new Date(fechaMax);
      maxDate.setHours(23, 59, 59, 999); // Incluir todo el día
      filtered = filtered.filter(r => r.created_at && new Date(r.created_at) <= maxDate);
    }

    setRows(filtered);
  };

  useEffect(() => {
    applyFilters();
  }, [selectedSegmentos, selectedCategorias, selectedProjectTypes, irrMin, irrMax, fechaMin, fechaMax, allRows]);

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

  const toggleProjectType = (type: string) => {
    setSelectedProjectTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const clearFilters = () => {
    setSelectedSegmentos([]);
    setSelectedProjectTypes([]);
    setSelectedCategorias([]);
    setIrrMin(null);
    setIrrMax(null);
    setFechaMin('');
    setFechaMax('');
  };

  async function handleDownload(projectId: string, projectType: string) {
    setDownloadingId(projectId);
    try {
      // Si es proyecto de operador, usar endpoint específico
      if (projectType === 'operador') {
        const { generateOperadorWordDocument } = await import('../utils/generateOperadorWordDocument');
        const operadorData = await api(`/v1/projects/${projectId}/operador-data`);
        await generateOperadorWordDocument(operadorData);
        return;
      }

      // Para proyectos de inversión, usar flujo actual
      const { generateWordDocument } = await import('../utils/generateWordDocument');
      const [configData, projectionData, debtData, valuationData, commercialY1Data, usaliY1Data] = await Promise.all([
        api(`/v1/projects/${projectId}/config`),
        api(`/v1/projects/${projectId}/projection`),
        api(`/v1/projects/${projectId}/debt`).catch(() => ({ loan_amount: 0, schedule: [] })),
        api(`/v1/projects/${projectId}/valuation-and-returns`),
        api(`/v1/projects/${projectId}/y1/commercial`).catch(() => ({ meses: [] })),
        api(`/v1/projects/${projectId}/y1/usali`).catch(() => ({ usali: [] }))
      ]);

      await generateWordDocument({
        basicInfo: {
          nombre: configData.nombre,
          segmento: configData.segmento,
          categoria: configData.categoria,
          provincia: configData.provincia,
          comunidad_autonoma: configData.comunidad_autonoma,
          zona: configData.zona,
          habitaciones: configData.habitaciones,
          horizonte: configData.horizonte
        },
        financing: {
          precio_compra: configData.precio_compra,
          capex_inicial: configData.capex_inicial,
          coste_tx_compra_pct: configData.coste_tx_compra_pct,
          ltv: configData.ltv,
          interes: configData.interes,
          plazo_anios: configData.plazo_anios
        },
        projection: projectionData.years || [],
        debt: debtData.schedule || [],
        vr: valuationData,
        y1Commercial: commercialY1Data.meses || [],
        y1Usali: usaliY1Data.usali || []
      });
    } catch (error) {
      console.error('Error generando documento Word:', error);
      alert('Error al generar documento Word: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setDownloadingId(null);
    }
  }

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

          <div className="grid grid-cols-4 gap-4">
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

            {/* Filtro por tipo de proyecto */}
            <div>
              <label className="block text-sm font-medium mb-2">Tipo de Proyecto</label>
              <div className="space-y-1">
                {PROJECT_TYPES.map(type => (
                  <label key={type.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedProjectTypes.includes(type.key)}
                      onChange={() => toggleProjectType(type.key)}
                      className="rounded"
                    />
                    <span className="text-sm">{type.label}</span>
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

            {/* Filtro por rango de Fecha de Alta */}
            <div>
              <label className="block text-sm font-medium mb-2">Rango de Fecha de Alta</label>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-600">Desde</label>
                  <input
                    type="date"
                    value={fechaMin}
                    onChange={e => setFechaMin(e.target.value)}
                    className="w-full border px-2 py-1 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Hasta</label>
                  <input
                    type="date"
                    value={fechaMax}
                    onChange={e => setFechaMax(e.target.value)}
                    className="w-full border px-2 py-1 rounded text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Resumen de filtros activos */}
          {(selectedSegmentos.length > 0 || selectedCategorias.length > 0 || selectedProjectTypes.length > 0 || irrMin !== null || irrMax !== null || fechaMin || fechaMax) && (
            <div className="mt-3 pt-3 border-t text-sm">
              <strong>Filtros activos:</strong>{' '}
              {selectedSegmentos.length > 0 && <span className="text-blue-600">Segmentos: {selectedSegmentos.join(', ')} </span>}
              {selectedCategorias.length > 0 && <span className="text-green-600">Categorías: {selectedCategorias.join(', ')} </span>}
              {selectedProjectTypes.length > 0 && <span className="text-indigo-600">Tipo: {selectedProjectTypes.map(t => PROJECT_TYPES.find(pt => pt.key === t)?.label).join(', ')} </span>}
              {(irrMin !== null || irrMax !== null) && (
                <span className="text-purple-600">
                  IRR: {irrMin ?? '-∞'}% - {irrMax ?? '+∞'}%{' '}
                </span>
              )}
              {(fechaMin || fechaMax) && (
                <span className="text-orange-600">
                  Fecha: {fechaMin || 'inicio'} - {fechaMax || 'hoy'}
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
              <th className="p-2">Tipo</th>
              <th className="p-2">Equity</th>
              <th className="p-2">Keys</th>
              <th className="p-2">Price/Key</th>
              <th className="p-2">IRR lev.</th>
              <th className="p-2">MOIC lev.</th>
              <th className="p-2">FEES (€)</th>
              <th className="p-2">FEES (€/key)</th>
              <th className="p-2" colSpan={2}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r=>{
              const isOperador = r.project_type === 'operador';
              return (
              <tr key={r.project_id} className="border-t hover:bg-gray-50">
                <td className="p-2 text-left">{r.nombre}</td>
                <td className="p-2 text-center text-xs">{r.provincia}</td>
                <td className="p-2 text-center capitalize">{r.segmento}</td>
                <td className="p-2 text-center capitalize text-xs">{r.categoria?.replace('_', ' ')}</td>
                <td className="p-2 text-center">
                  {r.project_type ? (
                    <span className={`px-2 py-1 rounded text-xs ${
                      r.project_type === 'operador' ? 'bg-purple-100 text-purple-800' :
                      'bg-indigo-100 text-indigo-800'
                    }`}>
                      {r.project_type === 'operador' ? 'Oper.' : 'Inv.'}
                    </span>
                  ) : '-'}
                </td>
                <td className="p-2 text-right">{isOperador ? '—' : (r.equity != null ? fmt(r.equity) : '—')}</td>
                <td className="p-2 text-right">{r.habitaciones}</td>
                <td className="p-2 text-right">{isOperador ? '—' : fmt(r.price_per_key)}</td>
                <td className="p-2 text-right">{isOperador ? '—' : (r.irr_levered!=null ? pct(r.irr_levered) : '—')}</td>
                <td className="p-2 text-right">{isOperador ? '—' : (r.moic_levered!=null ? fmtDecimal(r.moic_levered, 2) + 'x' : '—')}</td>
                <td className="p-2 text-right">{r.total_fees != null ? fmt(r.total_fees) : '—'}</td>
                <td className="p-2 text-right">{r.fees_per_key != null ? fmt(r.fees_per_key) : '—'}</td>
                <td className="p-2 text-center">
                  <button className="px-2 py-1 border rounded hover:bg-gray-100 text-xs" onClick={()=>onOpen(r.project_id)}>Abrir</button>
                </td>
                <td className="p-2 text-center">
                  <button
                    className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-xs"
                    onClick={()=>handleDownload(r.project_id, r.project_type)}
                    disabled={downloadingId === r.project_id}
                  >
                    {downloadingId === r.project_id ? 'Descargando...' : 'Descargar'}
                  </button>
                </td>
              </tr>
            );
            })}
            {!rows.length && <tr><td className="p-4 text-center text-gray-500" colSpan={14}>{allRows.length > 0 ? 'Ningún proyecto coincide con los filtros seleccionados' : 'Solo se muestran proyectos finalizados'}</td></tr>}
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
