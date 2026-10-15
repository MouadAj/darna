'use client';
import {CheckCircle2, X} from 'lucide-react';
import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useLocale, useTranslations} from 'next-intl';

interface ToastValue {show: (message: string) => void}
const ToastContext = createContext<ToastValue | null>(null);

export function ToastProvider({children}: {children: React.ReactNode}) {
  const t = useTranslations('common');
  const locale = useLocale();
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismiss = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    setMessage(null);
  }, []);
  const show = useCallback((next: string) => {
    if (timer.current !== null) clearTimeout(timer.current);
    setMessage(next);
    timer.current = setTimeout(() => {setMessage(null); timer.current = null;}, 5000);
  }, []);
  useEffect(() => () => {if (timer.current !== null) clearTimeout(timer.current);}, []);
  const value = useMemo(() => ({show}), [show]);
  return <ToastContext.Provider value={value}>{children}<div lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} className={message ? 'toast' : undefined} role="status" aria-live="polite" aria-atomic="true">{message && <><CheckCircle2 aria-hidden="true"/><span>{message}</span><button type="button" onClick={dismiss} aria-label={t('dismiss')}><X aria-hidden="true"/></button></>}</div></ToastContext.Provider>;
}
export function useToast() { const value = useContext(ToastContext); if (!value) throw new Error('useToast must be used in ToastProvider'); return value; }
