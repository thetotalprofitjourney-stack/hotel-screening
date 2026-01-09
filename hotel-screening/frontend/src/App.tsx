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
      // Verificar si hay parámetros en la URL (email y userid)
      const urlParams = new URLSearchParams(window.location.search);
      const urlEmail = urlParams.get('email');
      const urlUserId = urlParams.get('userid');

      // Si hay email en la URL, usarlo directamente sin popup
      if (urlEmail) {
        const normalizedEmail = urlEmail.toLowerCase();
        localStorage.setItem('email', normalizedEmail);
        setUserEmail(normalizedEmail);

        // Hacer llamada al backend incluyendo userid si existe
        try {
          const headers: Record<string, string> = { 'x-user-email': normalizedEmail };
          if (urlUserId) {
            headers['x-kajabi-user-id'] = urlUserId;
          }

          await fetch(`${API_URL}/v1/projects`, { headers });
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
            await fetch(`${API_URL}/v1/projects`, {
              headers: { 'x-user-email': normalizedEmail }
            });
          } catch (error) {
            console.error('Error inicializando usuario:', error);
          }
        }
      }
    };

    initializeUser();
  }, []);

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
