const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export async function api(path: string, opts: RequestInit = {}) {
  const headers = new Headers(opts.headers);
  // Simula sesión Kajabi: pasa el email logueado
  headers.set('x-user-email', (localStorage.getItem('email') || 'demo@user.com'));
  headers.set('Content-Type', 'application/json');
  const res = await fetch(`${API}${path}`, { ...opts, headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
