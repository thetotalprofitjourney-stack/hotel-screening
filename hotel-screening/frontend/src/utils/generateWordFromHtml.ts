import { api } from '../api';

interface GenerateWordFromHtmlParams {
  projectId: string;
}

export async function generateWordFromHtml(params: GenerateWordFromHtmlParams) {
  try {
    console.log('Iniciando generación de documento Word desde HTML en el servidor...');

    const { projectId } = params;

    if (!projectId) {
      throw new Error('El ID del proyecto es requerido');
    }

    // Configurar headers con autenticación
    const API = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';
    const headers = new Headers();
    headers.set('x-user-email', (localStorage.getItem('email') || 'demo@user.com'));
    headers.set('Content-Type', 'application/json');

    // Llamar al endpoint del backend que hace la conversión
    const response = await fetch(`${API}/v1/projects/${projectId}/snapshot/word`, {
      method: 'POST',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(errorData.error || `Error del servidor: ${response.status}`);
    }

    // Obtener el blob del archivo Word
    const blob = await response.blob();

    if (!blob || blob.size === 0) {
      throw new Error('El archivo generado está vacío');
    }

    console.log(`Archivo Word recibido del servidor: ${blob.size} bytes`);

    // Extraer el nombre del archivo del header Content-Disposition
    const contentDisposition = response.headers.get('Content-Disposition');
    let fileName = `Proyecto_APP_${new Date().toISOString().split('T')[0]}.docx`;

    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (fileNameMatch && fileNameMatch[1]) {
        fileName = decodeURIComponent(fileNameMatch[1].replace(/['"]/g, ''));
      }
    }

    // Crear un link temporal para descargar el archivo
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    console.log('Documento descargado exitosamente:', fileName);
  } catch (error) {
    console.error('Error al generar documento Word desde HTML:', error);
    if (error instanceof Error) {
      console.error('Mensaje de error:', error.message);
    }
    throw error;
  }
}
