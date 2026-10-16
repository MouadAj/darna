'use client';

import {createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {ServiceWorkerRegistration} from './service-worker-registration';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{outcome: 'accepted' | 'dismissed'}>;
}
type Platform = 'ios' | 'android' | 'other';
type Outcome = 'idle' | 'accepted' | 'dismissed' | 'error';
interface PwaState {
  platform: Platform;
  installed: boolean;
  canInstall: boolean;
  pending: boolean;
  outcome: Outcome;
  registrationFailed: boolean;
  install(): Promise<void>;
}
const PwaContext = createContext<PwaState>({platform:'other',installed:false,canInstall:false,pending:false,outcome:'idle',registrationFailed:false,install:async()=>{}});

function standalone() {
  return Boolean(window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & {standalone?: boolean}).standalone);
}
function subscribeDisplayMode(listener: () => void) {
  const query = window.matchMedia?.('(display-mode: standalone)');
  query?.addEventListener('change', listener);
  return () => query?.removeEventListener('change', listener);
}
function platform(): Platform {
  if (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  return /Android/.test(navigator.userAgent) ? 'android' : 'other';
}
const subscribePlatform = () => () => {};

export function PwaProvider({children}: {children: React.ReactNode}) {
  const isStandalone = useSyncExternalStore(subscribeDisplayMode, standalone, () => false);
  const device = useSyncExternalStore(subscribePlatform, platform, (): Platform => 'other');
  const [installed, setInstalled] = useState(false);
  const [available, setAvailable] = useState(false);
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>('idle');
  const [registrationFailed, setRegistrationFailed] = useState(false);
  const prompt = useRef<InstallPromptEvent | null>(null);
  const registrationError = useCallback(() => setRegistrationFailed(true), []);

  useEffect(() => {
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      prompt.current = event as InstallPromptEvent;
      setAvailable(true);
      setOutcome('idle');
    };
    const didInstall = () => {
      prompt.current = null;
      setAvailable(false);
      setInstalled(true);
    };
    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', didInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', didInstall);
    };
  }, []);

  const install = async () => {
    const event = prompt.current;
    if (!event || standalone() || installed) return;
    // Each browser event can be used once, including when the user cancels.
    prompt.current = null;
    setAvailable(false);
    setPending(true);
    setOutcome('idle');
    try {
      await event.prompt();
      setOutcome((await event.userChoice).outcome);
    } catch {
      setOutcome('error');
    } finally {
      setPending(false);
    }
  };

  return <PwaContext.Provider value={{platform:device,installed:installed||isStandalone,canInstall:available&&!installed&&!isStandalone,pending,outcome,registrationFailed,install}}>
    {children}<ServiceWorkerRegistration onError={registrationError}/>
  </PwaContext.Provider>;
}

export function usePwa() { return useContext(PwaContext); }
