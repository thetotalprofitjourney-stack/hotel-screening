import React, { useEffect, useState } from 'react';

export interface ProjectBasicInfo {
  nombre: string;
  comunidad_autonoma: string;
  provincia: string;
  zona: string;
  segmento: 'urbano' | 'vacacional';
  categoria: 'economy' | 'midscale' | 'upper_midscale' | 'upscale' | 'upper_upscale' | 'luxury';
  habitaciones: number;
}

interface ProjectBasicInfoFormProps {
  data: ProjectBasicInfo;
  onChange: (data: ProjectBasicInfo) => void;
  onSubmit: () => void;
  readOnly?: boolean;
}

interface Categoria {
  category_code: string;
  display_label: string;
}

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

export default function ProjectBasicInfoForm({ data, onChange, onSubmit, readOnly = false }: ProjectBasicInfoFormProps) {
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
    if (data.comunidad_autonoma) {
      fetch(`${API_URL}/v1/hierarchy/provincias?ca=${encodeURIComponent(data.comunidad_autonoma)}`, {
        headers: { 'x-user-email': localStorage.getItem('email') || 'demo@user.com' }
      })
        .then(res => res.json())
        .then(data => setProvincias(data))
        .catch(err => console.error('Error loading provincias:', err));
    } else {
      setProvincias([]);
    }
  }, [data.comunidad_autonoma]);

  // Cargar zonas cuando se seleccionan comunidad autónoma y provincia
  useEffect(() => {
    if (data.comunidad_autonoma && data.provincia) {
      fetch(`${API_URL}/v1/hierarchy/zonas?ca=${encodeURIComponent(data.comunidad_autonoma)}&prov=${encodeURIComponent(data.provincia)}`, {
        headers: { 'x-user-email': localStorage.getItem('email') || 'demo@user.com' }
      })
        .then(res => res.json())
        .then(data => setZonas(data))
        .catch(err => console.error('Error loading zonas:', err));
    } else {
      setZonas([]);
    }
  }, [data.comunidad_autonoma, data.provincia]);

  // Cargar categorías al montar el componente
  useEffect(() => {
    fetch(`${API_URL}/v1/hierarchy/categorias`, {
      headers: { 'x-user-email': localStorage.getItem('email') || 'demo@user.com' }
    })
      .then(res => res.json())
      .then(data => setCategorias(data))
      .catch(err => console.error('Error loading categorías:', err));
  }, []);

  function updateField<K extends keyof ProjectBasicInfo>(field: K, value: ProjectBasicInfo[K]) {
    // Si se cambia la comunidad autónoma, limpiar provincia y zona
    if (field === 'comunidad_autonoma') {
      onChange({ ...data, [field]: value, provincia: '', zona: '' });
    }
    // Si se cambia la provincia, limpiar zona
    else if (field === 'provincia') {
      onChange({ ...data, [field]: value, zona: '' });
    }
    else {
      onChange({ ...data, [field]: value });
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  function getCategoriaDisplayLabel(): string {
    const categoria = categorias.find(cat => cat.category_code === data.categoria);
    if (categoria) {
      return categoria.display_label;
    }
    // Fallback a labels hardcodeados
    return getCategoriaLabel(data.categoria);
  }

  if (readOnly) {
    return (
      <div className="border rounded-lg p-4 bg-gray-50">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium">Proyecto:</span> {data.nombre}
          </div>
          <div>
            <span className="font-medium">Ubicación:</span> {data.comunidad_autonoma} - {data.provincia} - {data.zona}
          </div>
          <div>
            <span className="font-medium">Segmento:</span> {data.segmento === 'urbano' ? 'Urbano' : 'Vacacional'}
          </div>
          <div>
            <span className="font-medium">Categoría:</span> {getCategoriaDisplayLabel()}
          </div>
          <div>
            <span className="font-medium">Habitaciones:</span> {data.habitaciones}
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Datos del Proyecto</h3>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Nombre del proyecto *</span>
            <input
              required
              className="border px-3 py-2 rounded"
              type="text"
              value={data.nombre}
              onChange={e => updateField('nombre', e.target.value)}
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Comunidad Autónoma *</span>
            <select
              required
              className="border px-3 py-2 rounded"
              value={data.comunidad_autonoma}
              onChange={e => updateField('comunidad_autonoma', e.target.value)}
            >
              <option value="">Seleccione una comunidad autónoma</option>
              {comunidades.map(ca => (
                <option key={ca} value={ca}>{ca}</option>
              ))}
            </select>
            <span className="text-xs text-gray-500 mt-1">
              Nivel 1: Filtra las opciones de Provincia
            </span>
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Provincia *</span>
            <select
              required
              className="border px-3 py-2 rounded"
              value={data.provincia}
              onChange={e => updateField('provincia', e.target.value)}
              disabled={!data.comunidad_autonoma || provincias.length === 0}
            >
              <option value="">
                {!data.comunidad_autonoma
                  ? 'Primero seleccione una comunidad autónoma'
                  : provincias.length === 0
                  ? 'No hay provincias disponibles'
                  : 'Seleccione una provincia'}
              </option>
              {provincias.map(prov => (
                <option key={prov} value={prov}>{prov}</option>
              ))}
            </select>
            <span className="text-xs text-gray-500 mt-1">
              Nivel 2: Filtra las opciones de Zona
            </span>
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Zona *</span>
            <select
              required
              className="border px-3 py-2 rounded"
              value={data.zona}
              onChange={e => updateField('zona', e.target.value)}
              disabled={!data.provincia || zonas.length === 0}
            >
              <option value="">
                {!data.provincia
                  ? 'Primero seleccione una provincia'
                  : zonas.length === 0
                  ? 'No hay zonas disponibles'
                  : 'Seleccione una zona'}
              </option>
              {zonas.map(zona => (
                <option key={zona} value={zona}>{zona}</option>
              ))}
            </select>
            <span className="text-xs text-gray-500 mt-1">
              Nivel 3: Define la ubicación geográfica para el benchmark
            </span>
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Segmento *</span>
            <select
              required
              className="border px-3 py-2 rounded"
              value={data.segmento}
              onChange={e => updateField('segmento', e.target.value as ProjectBasicInfo['segmento'])}
            >
              <option value="urbano">Urbano</option>
              <option value="vacacional">Vacacional</option>
            </select>
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Categoría *</span>
            <select
              required
              className="border px-3 py-2 rounded"
              value={data.categoria}
              onChange={e => updateField('categoria', e.target.value as ProjectBasicInfo['categoria'])}
            >
              <option value="">Seleccione una categoría</option>
              {categorias.map(cat => (
                <option key={cat.category_code} value={cat.category_code}>
                  {cat.display_label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Habitaciones *</span>
            <input
              required
              className="border px-3 py-2 rounded"
              type="number"
              min={1}
              value={data.habitaciones}
              onChange={e => updateField('habitaciones', Number(e.target.value))}
            />
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="px-6 py-2 bg-black text-white rounded hover:bg-gray-800"
        >
          Continuar al Paso 1
        </button>
      </div>
    </form>
  );
}

function getCategoriaLabel(categoria: string): string {
  const labels: Record<string, string> = {
    economy: 'Economy (2*)',
    midscale: 'Midscale (3*)',
    upper_midscale: 'Upper Midscale (3* sup)',
    upscale: 'Upscale (4*)',
    upper_upscale: 'Upper Upscale (4* sup)',
    luxury: 'Luxury (5*)'
  };
  return labels[categoria] || categoria;
}
