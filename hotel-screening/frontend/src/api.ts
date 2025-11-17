const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export async function api(path: string, opts: RequestInit = {}) {
  const headers = new Headers(opts.headers);
  // Simula sesión Kajabi: pasa el email logueado
  headers.set('x-user-email', (localStorage.getItem('email') || 'demo@user.com'));
  headers.set('Content-Type', 'application/json');
  
  try {
    const res = await fetch(`${API}${path}`, { ...opts, headers });
    
    if (!res.ok) {
      // Intentar extraer mensaje de error del servidor
      const errorText = await res.text();
      let errorMessage = errorText;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorText;
      } catch {
        // Si no es JSON válido, usar el texto tal cual
      }
      
      throw new Error(`HTTP ${res.status}: ${errorMessage}`);
    }
    
    return res.json();
  } catch (error) {
    if (error instanceof Error) {
      console.error('[API Error]', error.message);
      throw error;
    }
    throw new Error('Unknown error occurred');
  }
}
