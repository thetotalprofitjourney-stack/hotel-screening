import React, { useState } from 'react';
import { api } from '../api';

export default function NewProject({ onCancel, onCreated }:{ onCancel:()=>void; onCreated:(id:string)=>void }) {
  const [form, setForm] = useState({
    nombre:'',
    comunidad_autonoma:'',
    provincia:'',
    zona:'',
    segmento:'vacacional',
    categoria:'upscale',
    habitaciones:120,
    horizonte:7,
    moneda:'EUR'
  });

  async function onSubmit(e:React.FormEvent) {
    e.preventDefault();
    const res = await api('/v1/projects',{ method:'POST', body: JSON.stringify(form) });
    onCreated(res.project_id);
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <h2 className="text-xl font-semibold mb-2">Nuevo proyecto</h2>
      <div className="grid grid-cols-2 gap-3">
        <label>Nombre <input className="input" value={form.nombre} onChange={e=>setForm({...form, nombre:e.target.value})} required /></label>
        <label>Comunidad Autónoma <input className="input" value={form.comunidad_autonoma} onChange={e=>setForm({...form, comunidad_autonoma:e.target.value})} placeholder="ej: Andalucía" required /></label>
        <label>Provincia <input className="input" value={form.provincia} onChange={e=>setForm({...form, provincia:e.target.value})} placeholder="ej: Málaga" required /></label>
        <label>Zona <input className="input" value={form.zona} onChange={e=>setForm({...form, zona:e.target.value})} placeholder="ej: Costa del Sol" required /></label>
        <label>Segmento
          <select className="input" value={form.segmento} onChange={e=>setForm({...form, segmento:e.target.value as any})}>
            <option>urbano</option><option>vacacional</option>
          </select>
        </label>
        <label>Categoría
          <select className="input" value={form.categoria} onChange={e=>setForm({...form, categoria:e.target.value as any})}>
            <option>economy</option><option>midscale</option><option>upper_midscale</option>
            <option>upscale</option><option>upper_upscale</option><option>luxury</option>
          </select>
        </label>
        <label>Habitaciones <input className="input" type="number" min={1} value={form.habitaciones} onChange={e=>setForm({...form, habitaciones:Number(e.target.value)})} /></label>
      </div>
      <div className="flex gap-2">
        <button className="px-3 py-2 bg-black text-white rounded" type="submit">Crear</button>
        <button className="px-3 py-2 border rounded" type="button" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}
