'use client';
import {useEffect} from 'react';
export function ServiceWorkerRegistration({onError}: {onError?: () => void}) {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      void navigator.serviceWorker.register('/sw.js').catch(() => onError?.());
    }
  }, [onError]);
  return null;
}
