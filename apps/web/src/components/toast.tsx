'use client';
import {CheckCircle2, X} from 'lucide-react';
import {createContext, useCallback, useContext, useMemo, useState} from 'react';

interface ToastValue {show: (message: string) => void}
const ToastContext = createContext<ToastValue | null>(null);

export function ToastProvider({children}: {children: React.ReactNode}) {
  const [message, setMessage] = useState<string | null>(null);
  const show = useCallback((next: string) => { setMessage(next); window.setTimeout(() => setMessage(null), 3200); }, []);
  const value = useMemo(() => ({show}), [show]);
  return <ToastContext.Provider value={value}>{children}{message && <div className="toast" role="status"><CheckCircle2 aria-hidden="true"/><span>{message}</span><button onClick={() => setMessage(null)} aria-label="Dismiss"><X /></button></div>}</ToastContext.Provider>;
}
export function useToast() { const value = useContext(ToastContext); if (!value) throw new Error('useToast must be used in ToastProvider'); return value; }
