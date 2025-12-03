'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast doit être utilisé à l\'intérieur de ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);

    // Disparition automatique après 3 secondes
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* CONTENEUR DES TOASTS (Fixé en bas à droite) */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)} // Clic pour fermer
            className={`
              pointer-events-auto cursor-pointer
              flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border backdrop-blur-md
              transform transition-all duration-300 animate-in slide-in-from-right-10 fade-in
              ${toast.type === 'success' 
                ? 'bg-black/80 border-[#00e054] text-white' 
                : toast.type === 'error' 
                  ? 'bg-black/80 border-red-500 text-white' 
                  : 'bg-black/80 border-white/20 text-gray-200'
              }
            `}
          >
            <span className="text-xl">
              {toast.type === 'success' ? '✅' : toast.type === 'error' ? '⚠️' : 'ℹ️'}
            </span>
            <div className="flex flex-col">
              <span className="font-bold text-sm">
                {toast.type === 'success' ? 'Succès' : toast.type === 'error' ? 'Erreur' : 'Info'}
              </span>
              <span className="text-xs opacity-90">{toast.message}</span>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}