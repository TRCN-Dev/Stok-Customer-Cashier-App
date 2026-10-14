import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error filter to prevent benign Firebase Auth popup cancellation errors from triggering runtime alerts
window.addEventListener('error', (event) => {
  const msg = event?.message || '';
  if (
    msg.includes('INTERNAL ASSERTION FAILED: Pending promise was never set') ||
    msg.includes('auth/popup-closed-by-user') ||
    msg.includes('auth/cancelled-popup-request')
  ) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return true;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event?.reason;
  const msg = typeof reason === 'string' ? reason : reason?.message || '';
  const code = reason?.code || '';
  if (
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request' ||
    msg.includes('INTERNAL ASSERTION FAILED: Pending promise was never set') ||
    msg.includes('popup-closed-by-user')
  ) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
});

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/30">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-lg font-extrabold text-white">TRICOINS Laundry App</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Terjadi kendala saat memuat halaman. Silakan tekan tombol di bawah untuk menyegarkan tampilan dengan aman.
            </p>
            <button
              onClick={() => {
                window.location.reload();
              }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md transition transform active:scale-95 cursor-pointer"
            >
              Muat Ulang Halaman (Refresh)
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
