import React, { useEffect, useState } from 'react';
import ProjectList from './pages/ProjectList';
import NewProject from './pages/NewProject';
import Wizard from './pages/Wizard';
import Selector from './pages/Selector';

type View = { name:'list' } | { name:'new' } | { name:'wizard', projectId:string } | { name:'selector' };

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

export default function App() {
  const [view, setView] = useState<View>({ name:'list' });
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    const initializeUser = async () => {
      // Verificar si hay parámetros en la URL
      // - email: OBLIGATORIO para evitar popup (si no está, se mostrará el popup)
      // - userid: OPCIONAL (si existe, se guarda como kajabi_user_id)
      const urlParams = new URLSearchParams(window.location.search);
      const urlEmail = urlParams.get('email');
      const urlUserId = urlParams.get('userid');

      // Si hay email en la URL, usarlo directamente sin popup
      // El userid es opcional: si existe se envía, si no existe se crea usuario sin él
      if (urlEmail) {
        const normalizedEmail = urlEmail.toLowerCase();
        localStorage.setItem('email', normalizedEmail);
        setUserEmail(normalizedEmail);

        // Hacer llamada al backend para crear/actualizar usuario incluyendo userid si existe
        try {
          const headers: Record<string, string> = {
            'x-user-email': normalizedEmail,
            'Content-Type': 'application/json'
          };
          if (urlUserId) {
            headers['x-kajabi-user-id'] = urlUserId;
          }

          const response = await fetch(`${API_URL}/v1/auth/init`, {
            method: 'POST',
            headers
          });

          if (!response.ok) {
            console.error('Error al inicializar usuario:', response.status, response.statusText);
          } else {
            const data = await response.json();
            console.log('Usuario inicializado correctamente:', data);
          }
        } catch (error) {
          console.error('Error inicializando usuario desde URL:', error);
        }

        // Limpiar los parámetros de la URL para que no se vuelvan a procesar
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      // Si no hay email en URL, verificar localStorage o mostrar popup
      const storedEmail = localStorage.getItem('email');
      if (storedEmail) {
        setUserEmail(storedEmail);
      } else {
        const e = prompt('Email de usuario (simulado Kajabi):','demo@user.com');
        if (e) {
          const normalizedEmail = e.toLowerCase();
          localStorage.setItem('email', normalizedEmail);
          setUserEmail(normalizedEmail);

          // Hacer una llamada al backend para que el middleware cree el usuario automáticamente
          try {
            const response = await fetch(`${API_URL}/v1/auth/init`, {
              method: 'POST',
              headers: {
                'x-user-email': normalizedEmail,
                'Content-Type': 'application/json'
              }
            });

            if (!response.ok) {
              console.error('Error al inicializar usuario:', response.status, response.statusText);
            } else {
              const data = await response.json();
              console.log('Usuario inicializado correctamente:', data);
            }
          } catch (error) {
            console.error('Error inicializando usuario:', error);
          }
        }
      }
    };

    initializeUser();
  }, []);

  // No renderizar los componentes hasta que el email esté disponible
  // Esto evita la race condition donde ProjectList intenta cargar proyectos
  // antes de que localStorage tenga el email guardado
  if (!userEmail) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-500">Cargando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div></div>
        <div className="text-sm text-gray-500">usuario: {userEmail}</div>
      </header>

	  {view.name==='list'    && <ProjectList onNew={()=>setView({name:'new'})} onOpen={(id)=>setView({name:'wizard', projectId:id})} onSelector={()=>setView({name:'selector'})} />}
	  {view.name==='selector'&& <Selector onOpen={(id)=>setView({name:'wizard', projectId:id})} onBack={()=>setView({name:'list'})} />}
      {view.name==='new'    && <NewProject onCancel={()=>setView({name:'list'})} onCreated={(id)=>setView({name:'wizard',projectId:id})} />}
      {view.name==='wizard' && <Wizard projectId={view.projectId} onBack={()=>setView({name:'list'})} />}
    </div>
  );
}
