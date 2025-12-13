import React from 'react';

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

export default function ProjectBasicInfoForm({ data, onChange, onSubmit, readOnly = false }: ProjectBasicInfoFormProps) {
  function updateField<K extends keyof ProjectBasicInfo>(field: K, value: ProjectBasicInfo[K]) {
    onChange({ ...data, [field]: value });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit();
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
            <span className="font-medium">Categoría:</span> {getCategoriaLabel(data.categoria)}
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
            <input
              required
              className="border px-3 py-2 rounded"
              type="text"
              placeholder="ej: Andalucía"
              value={data.comunidad_autonoma}
              onChange={e => updateField('comunidad_autonoma', e.target.value)}
            />
            <span className="text-xs text-gray-500 mt-1">
              Nivel 1: Filtra las opciones de Provincia
            </span>
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Provincia *</span>
            <input
              required
              className="border px-3 py-2 rounded"
              type="text"
              placeholder="ej: Málaga"
              value={data.provincia}
              onChange={e => updateField('provincia', e.target.value)}
            />
            <span className="text-xs text-gray-500 mt-1">
              Nivel 2: Filtra las opciones de Zona
            </span>
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Zona *</span>
            <input
              required
              className="border px-3 py-2 rounded"
              type="text"
              placeholder="ej: Costa del Sol"
              value={data.zona}
              onChange={e => updateField('zona', e.target.value)}
            />
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
              <option value="economy">Economy (2*)</option>
              <option value="midscale">Midscale (3*)</option>
              <option value="upper_midscale">Upper Midscale (3* sup)</option>
              <option value="upscale">Upscale (4*)</option>
              <option value="upper_upscale">Upper Upscale (4* sup)</option>
              <option value="luxury">Luxury (5*)</option>
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
