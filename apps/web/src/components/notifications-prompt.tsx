'use client';
import {Bell, BellRing, X} from 'lucide-react';
import {useState, useSyncExternalStore} from 'react';
import {useTranslations} from 'next-intl';
import {api} from '@/lib/api';
import {useToast} from './toast';

function toBase64Url(value: ArrayBuffer | null): string {
  if (!value) return '';
  return btoa(String.fromCharCode(...new Uint8Array(value))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function decodeKey(value: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replaceAll('-', '+').replaceAll('_', '/');
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

export function NotificationsPrompt() {
  const t = useTranslations('notifications');
  const toast = useToast();
  const [dismissed, setDismissed] = useState(false);
  const [pending, setPending] = useState(false);
  const canPrompt = useSyncExternalStore(() => () => undefined, () => typeof Notification !== 'undefined' && Notification.permission === 'default' && localStorage.getItem('housefamily-notifications-later') !== 'true', () => false);
  const configured = process.env.NEXT_PUBLIC_PUSH_ENABLED === 'true' && Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
  const supported = typeof window !== 'undefined' && window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window;
  const visible = configured && supported && canPrompt && !dismissed;
  if (!visible) return null;
  const dismiss = () => { localStorage.setItem('housefamily-notifications-later', 'true'); setDismissed(true); };
  const enable = async () => {
    setPending(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {setDismissed(true); return;}
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (vapidKey && 'serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.register('/sw.js');
        const subscription = await registration.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: decodeKey(vapidKey)});
        await api('/notifications/push-subscriptions', {method: 'POST', body: JSON.stringify({endpoint: subscription.endpoint, p256dh: toBase64Url(subscription.getKey('p256dh')), auth: toBase64Url(subscription.getKey('auth'))})});
      }
      toast.show(t('enabled'));
      setDismissed(true);
    } catch {
      toast.show(t('unavailable'));
    } finally {
      setPending(false);
    }
  };
  return <section className="notification-prompt"><div className="notification-prompt-icon"><BellRing/></div><div><h2>{t('title')}</h2><p>{t('body')}</p><small>{t('explain')}</small><div className="notification-actions"><button className="button" disabled={pending} onClick={enable}><Bell/>{pending ? '…' : t('enable')}</button><button className="text-button" onClick={dismiss}><X/>{t('later')}</button></div></div></section>;
}
