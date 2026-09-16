import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('[React ErrorBoundary caught error]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center font-sans">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-4">
            ⚠️
          </div>
          <h2 className="text-lg font-black uppercase text-ink mb-2">Error de Carga en la Aplicación</h2>
          <p className="text-xs text-muted mb-6 max-w-sm font-mono bg-gray-50 p-3 rounded-xl border border-gray-100">
            {String(this.state.error?.message || this.state.error)}
          </p>
          <button 
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              window.location.href = '/';
            }}
            className="px-6 py-3 bg-ink hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider rounded-full transition-all shadow-md active:scale-95"
          >
            Reiniciar Aplicación y Limpiar Caché
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
