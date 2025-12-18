import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { generateWordDocument } from '../utils/generateWordDocument';

export default function ProjectList({ onNew, onOpen, onSelector }:{ onNew:()=>void; onOpen:(id:string)=>void; onSelector:()=>void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const loadProjects = () => {
    api('/v1/projects').then(setRows).catch(console.error);
  };

  useEffect(()=>{ loadProjects(); },[]);

  const handleDownload = async (projectId: string) => {
    setDownloadingId(projectId);
    try {
      // Load all necessary data for Word generation
      const [configData, projectionData, debtData, valuationData, commercialY1Data, usaliY1Data] = await Promise.all([
        api(`/v1/projects/${projectId}/config`),
        api(`/v1/projects/${projectId}/projection`),
        api(`/v1/projects/${projectId}/debt`),
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
          habitaciones: configData.habitaciones
        },
        operationConfig: {
          operacion_tipo: configData.operacion_tipo,
          fee_base_anual: configData.fee_base_anual,
          fee_pct_total_rev: configData.fee_pct_total_rev,
          fee_pct_gop: configData.fee_pct_gop,
          fee_incentive_pct: configData.fee_incentive_pct,
          fee_hurdle_gop_margin: configData.fee_hurdle_gop_margin,
          gop_ajustado: configData.gop_ajustado,
          ffe: configData.ffe,
          nonop_taxes_anual: configData.nonop_taxes_anual,
          nonop_insurance_anual: configData.nonop_insurance_anual,
          nonop_rent_anual: configData.nonop_rent_anual,
          nonop_other_anual: configData.nonop_other_anual
        },
        projectionAssumptions: {
          horizonte: projectionData.assumptions?.horizonte ?? 10,
          anio_base: projectionData.assumptions?.anio_base ?? new Date().getFullYear(),
          adr_growth_pct: projectionData.assumptions?.adr_growth_pct ?? 0.03,
          occ_delta_pp: projectionData.assumptions?.occ_delta_pp ?? 0,
          occ_cap: projectionData.assumptions?.occ_cap ?? 0.92,
          cost_inflation_pct: projectionData.assumptions?.cost_inflation_pct ?? 0,
          undistributed_inflation_pct: projectionData.assumptions?.undistributed_inflation_pct ?? 0,
          nonop_inflation_pct: projectionData.assumptions?.nonop_inflation_pct ?? 0
        },
        financingConfig: {
          precio_compra: configData.precio_compra,
          capex_inicial: configData.capex_inicial,
          coste_tx_compra_pct: configData.coste_tx_compra_pct,
          ltv: configData.ltv,
          interes: configData.interes,
          plazo_anios: configData.plazo_anios,
          tipo_amortizacion: configData.tipo_amortizacion
        },
        valuationConfig: {
          metodo_valoracion: configData.metodo_valoracion,
          cap_rate_salida: configData.cap_rate_salida,
          multiplo_salida: configData.multiplo_salida,
          coste_tx_venta_pct: configData.coste_tx_venta_pct
        },
        meses: commercialY1Data?.meses || [],
        calculatedUsali: usaliY1Data?.usali || null,
        editedUsaliData: usaliY1Data?.usali || null,
        annuals: projectionData.annuals,
        debt: debtData,
        vr: valuationData
      });
    } catch (error) {
      console.error('Error generando documento Word:', error);
      alert('Error al generar el documento. Por favor, intenta de nuevo.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (projectId: string, projectName: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el proyecto "${projectName}"?\n\nEsta acción eliminará todos los datos asociados (comercial Y1, USALI, proyecciones, deuda, valoración, etc.) y no se puede deshacer.`)) {
      return;
    }

    try {
      await api(`/v1/projects/${projectId}`, { method: 'DELETE' });
      loadProjects(); // Recargar la lista
    } catch (error) {
      console.error('Error eliminando proyecto:', error);
      alert('Error al eliminar el proyecto');
    }
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-semibold">Tus proyectos</h2>
		<button className="px-3 py-2 border rounded" onClick={onSelector}>Selector</button>
		<button className="px-3 py-2 bg-black text-white rounded" onClick={onNew}>Nuevo proyecto</button>
      </div>
      <table className="w-full border">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-2 text-left">Nombre</th>
            <th className="p-2">Ubicación</th>
            <th className="p-2">Segmento</th>
            <th className="p-2">Categoría</th>
            <th className="p-2">Estado</th>
            <th className="p-2">Fecha de Alta</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r=>(
            <tr key={r.project_id} className="border-t">
              <td className="p-2 text-left">{r.nombre}</td>
              <td className="p-2 text-center text-xs">{r.comunidad_autonoma} - {r.provincia} - {r.zona}</td>
              <td className="p-2 text-center">{r.segmento}</td>
              <td className="p-2 text-center">{r.categoria}</td>
              <td className="p-2 text-center">{r.estado}</td>
              <td className="p-2 text-center text-xs">{new Date(r.created_at).toLocaleDateString('es-ES')}</td>
              <td className="p-2 text-center">
                <div className="flex gap-2 justify-center">
                  <button className="px-2 py-1 border rounded hover:bg-gray-50" onClick={()=>onOpen(r.project_id)}>Abrir</button>
                  <button
                    className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    onClick={()=>handleDownload(r.project_id)}
                    disabled={r.estado !== 'finalized' || downloadingId === r.project_id}
                  >
                    {downloadingId === r.project_id ? 'Descargando...' : 'Descargar'}
                  </button>
                  <button className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600" onClick={()=>handleDelete(r.project_id, r.nombre)}>Eliminar</button>
                </div>
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr><td className="p-4 text-center text-gray-500" colSpan={7}>No hay proyectos</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
