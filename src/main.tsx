import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { LoginScreen, useAuthUser } from './components/AuthGate.tsx';
import './index.css';

function Root() {
  const { user, ready } = useAuthUser();

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <App userEmail={user.email || ''} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
