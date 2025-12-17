import React, { useState, useEffect } from 'react';
import { api } from '../api';

interface Categoria {
  category_code: string;
  display_label: string;
}

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

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

  const [comunidades, setComunidades] = useState<string[]>([]);
  const [provincias, setProvincias] = useState<string[]>([]);
  const [zonas, setZonas] = useState<string[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  // Cargar comunidades autónomas al montar el componente
  useEffect(() => {
    fetch(`${API_URL}/v1/hierarchy/comunidades-autonomas`, {
      headers: { 'x-user-email': localStorage.getItem('email') || 'demo@user.com' }
    })
      .then(res => res.json())
      .then(data => setComunidades(data))
      .catch(err => console.error('Error loading comunidades:', err));
  }, []);

  // Cargar provincias cuando se selecciona comunidad autónoma
  useEffect(() => {
    if (form.comunidad_autonoma) {
      fetch(`${API_URL}/v1/hierarchy/provincias?ca=${encodeURIComponent(form.comunidad_autonoma)}`, {
        headers: { 'x-user-email': localStorage.getItem('email') || 'demo@user.com' }
      })
        .then(res => res.json())
        .then(data => setProvincias(data))
        .catch(err => console.error('Error loading provincias:', err));
    } else {
      setProvincias([]);
    }
  }, [form.comunidad_autonoma]);

  // Cargar zonas cuando se seleccionan comunidad autónoma y provincia
  useEffect(() => {
    if (form.comunidad_autonoma && form.provincia) {
      fetch(`${API_URL}/v1/hierarchy/zonas?ca=${encodeURIComponent(form.comunidad_autonoma)}&prov=${encodeURIComponent(form.provincia)}`, {
        headers: { 'x-user-email': localStorage.getItem('email') || 'demo@user.com' }
      })
        .then(res => res.json())
        .then(data => setZonas(data))
        .catch(err => console.error('Error loading zonas:', err));
    } else {
      setZonas([]);
    }
  }, [form.comunidad_autonoma, form.provincia]);

  // Cargar categorías al montar el componente
  useEffect(() => {
    fetch(`${API_URL}/v1/hierarchy/categorias`, {
      headers: { 'x-user-email': localStorage.getItem('email') || 'demo@user.com' }
    })
      .then(res => res.json())
      .then(data => setCategorias(data))
      .catch(err => console.error('Error loading categorías:', err));
  }, []);

  function updateField(field: string, value: any) {
    // Si se cambia la comunidad autónoma, limpiar provincia y zona
    if (field === 'comunidad_autonoma') {
      setForm({ ...form, [field]: value, provincia: '', zona: '' });
    }
    // Si se cambia la provincia, limpiar zona
    else if (field === 'provincia') {
      setForm({ ...form, [field]: value, zona: '' });
    }
    else {
      setForm({ ...form, [field]: value });
    }
  }

  async function onSubmit(e:React.FormEvent) {
    e.preventDefault();
    const res = await api('/v1/projects',{ method:'POST', body: JSON.stringify(form) });
    onCreated(res.project_id);
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <h2 className="text-xl font-semibold mb-2">Nuevo proyecto</h2>
      <div className="grid grid-cols-2 gap-3">
        <label>Nombre <input className="input" value={form.nombre} onChange={e=>updateField('nombre', e.target.value)} required /></label>

        <label>Comunidad Autónoma
          <select className="input" value={form.comunidad_autonoma} onChange={e=>updateField('comunidad_autonoma', e.target.value)} required>
            <option value="">Seleccione una comunidad autónoma</option>
            {comunidades.map(ca => (
              <option key={ca} value={ca}>{ca}</option>
            ))}
          </select>
        </label>

        <label>Provincia
          <select
            className="input"
            value={form.provincia}
            onChange={e=>updateField('provincia', e.target.value)}
            disabled={!form.comunidad_autonoma || provincias.length === 0}
            required
          >
            <option value="">
              {!form.comunidad_autonoma
                ? 'Primero seleccione una comunidad autónoma'
                : provincias.length === 0
                ? 'No hay provincias disponibles'
                : 'Seleccione una provincia'}
            </option>
            {provincias.map(prov => (
              <option key={prov} value={prov}>{prov}</option>
            ))}
          </select>
        </label>

        <label>Zona
          <select
            className="input"
            value={form.zona}
            onChange={e=>updateField('zona', e.target.value)}
            disabled={!form.provincia || zonas.length === 0}
            required
          >
            <option value="">
              {!form.provincia
                ? 'Primero seleccione una provincia'
                : zonas.length === 0
                ? 'No hay zonas disponibles'
                : 'Seleccione una zona'}
            </option>
            {zonas.map(zona => (
              <option key={zona} value={zona}>{zona}</option>
            ))}
          </select>
        </label>

        <label>Segmento
          <select className="input" value={form.segmento} onChange={e=>updateField('segmento', e.target.value)}>
            <option value="urbano">Urbano</option>
            <option value="vacacional">Vacacional</option>
          </select>
        </label>

        <label>Categoría
          <select className="input" value={form.categoria} onChange={e=>updateField('categoria', e.target.value)} required>
            <option value="">Seleccione una categoría</option>
            {categorias.map(cat => (
              <option key={cat.category_code} value={cat.category_code}>
                {cat.display_label}
              </option>
            ))}
          </select>
        </label>

        <label>Habitaciones <input className="input" type="number" min={1} value={form.habitaciones} onChange={e=>updateField('habitaciones', Number(e.target.value))} /></label>
      </div>
      <div className="flex gap-2">
        <button className="px-3 py-2 bg-black text-white rounded" type="submit">Crear</button>
        <button className="px-3 py-2 border rounded" type="button" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}
