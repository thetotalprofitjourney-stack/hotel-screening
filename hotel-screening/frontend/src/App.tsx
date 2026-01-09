import React, { useEffect, useState } from 'react';
import ProjectList from './pages/ProjectList';
import NewProject from './pages/NewProject';
import Wizard from './pages/Wizard';
import Selector from './pages/Selector';

type View = { name:'list' } | { name:'new' } | { name:'wizard', projectId:string } | { name:'selector' };

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

export default function App() {
  const [view, setView] = useState<View>({ name:'list' });

  useEffect(() => {
    const initializeUser = async () => {
      if (!localStorage.getItem('email')) {
        const e = prompt('Email de usuario (simulado Kajabi):','demo@user.com');
        if (e) {
          const normalizedEmail = e.toLowerCase();
          localStorage.setItem('email', normalizedEmail);

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
        <div className="text-sm text-gray-500">usuario: {localStorage.getItem('email')}</div>
      </header>

	  {view.name==='list'    && <ProjectList onNew={()=>setView({name:'new'})} onOpen={(id)=>setView({name:'wizard', projectId:id})} onSelector={()=>setView({name:'selector'})} />}
	  {view.name==='selector'&& <Selector onOpen={(id)=>setView({name:'wizard', projectId:id})} onBack={()=>setView({name:'list'})} />}
      {view.name==='new'    && <NewProject onCancel={()=>setView({name:'list'})} onCreated={(id)=>setView({name:'wizard',projectId:id})} />}
      {view.name==='wizard' && <Wizard projectId={view.projectId} onBack={()=>setView({name:'list'})} />}
    </div>
  );
}
