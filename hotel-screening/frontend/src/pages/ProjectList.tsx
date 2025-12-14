import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function ProjectList({ onNew, onOpen, onSelector }:{ onNew:()=>void; onOpen:(id:string)=>void; onSelector:()=>void }) {
  const [rows, setRows] = useState<any[]>([]);

  const loadProjects = () => {
    api('/v1/projects').then(setRows).catch(console.error);
  };

  useEffect(()=>{ loadProjects(); },[]);

  const handleDelete = async (projectId: string, projectName: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el proyecto "${projectName}"?\n\nEsta acción eliminará todos los datos asociados (comercial Y1, USALI, proyecciones, deuda, valoración, etc.) y no se puede deshacer.`)) {
      return;
    }

    try {
      await api(`/v1/projects/${projectId}`, { method: 'DELETE' });
      alert('Proyecto eliminado correctamente');
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
