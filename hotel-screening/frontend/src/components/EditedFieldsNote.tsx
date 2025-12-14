import React from 'react';

interface EditedFieldsNoteProps {
  editedFields: string[];
  className?: string;
}

/**
 * Componente discreto que muestra qué campos fueron editados
 * respecto a los datos estimados originales del benchmark.
 */
export default function EditedFieldsNote({ editedFields, className = '' }: EditedFieldsNoteProps) {
  if (editedFields.length === 0) {
    return null;
  }

  return (
    <div className={`mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm ${className}`}>
      <p className="font-medium text-blue-900 mb-1.5">
        ℹ️ Sobre los datos estimados, se han realizado cambios en los siguientes campos:
      </p>
      <ul className="list-disc list-inside text-blue-800 space-y-0.5">
        {editedFields.map((field, idx) => (
          <li key={idx}>{field}</li>
        ))}
      </ul>
    </div>
  );
}
