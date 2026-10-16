'use client';

import {CheckCircle2, Download, Globe, MonitorSmartphone, Share, Smartphone, Wifi} from 'lucide-react';
import Link from 'next/link';
import {useLocale, useTranslations} from 'next-intl';
import {BrandLogo} from './brand-logo';
import {PendingLabel} from './loading';
import {usePwa} from './pwa-provider';

export function InstallLink({className = ''}: {className?: string}) {
  const t = useTranslations('pwa');
  const locale = useLocale();
  const {installed} = usePwa();
  if (installed) return null;
  return <Link href={`/${locale}/install`} className={`install-link ${className}`}><Download aria-hidden="true"/>{t('link')}</Link>;
}

export function InstallPage() {
  const t = useTranslations('pwa');
  const locale = useLocale();
  const {platform,installed,canInstall,pending,outcome,registrationFailed,install} = usePwa();
  const devices = platform === 'ios' ? ['ios','android'] as const : ['android','ios'] as const;

  return <div className="install-page">
    <header className="install-header"><Link href={`/${locale}/welcome`} aria-label="Darna"><BrandLogo/></Link><Link className="text-button" href={`/${locale}`}>{t('continue')}</Link></header>
    <main>
      <section className="install-hero" aria-labelledby="install-title">
        <span className="install-app-icon" aria-hidden="true"><BrandLogo markOnly/></span>
        <p className="eyebrow">{t('eyebrow')}</p>
        <h1 id="install-title">{t('title')}</h1>
        <p className="install-intro">{t('intro')}</p>
        {installed ? <div className="install-status" role="status"><CheckCircle2 aria-hidden="true"/><div><h2>{t('installedTitle')}</h2><p>{t('installedBody')}</p></div></div> : <>
          {(canInstall||pending)&&<button type="button" className="button install-primary" disabled={pending} onClick={()=>void install()}><Download aria-hidden="true"/><PendingLabel pending={pending}>{t(pending?'installing':'install')}</PendingLabel></button>}
          <p className="install-feedback" role="status" aria-live="polite">{outcome==='accepted'?t('accepted'):outcome==='dismissed'?t('dismissed'):outcome==='error'?t('failed'):t('manualHint')}</p>
        </>}
        {registrationFailed&&!installed&&<p className="install-warning" role="alert">{t('prepareFailed')} <button className="text-button" type="button" onClick={()=>window.location.reload()}>{t('reload')}</button></p>}
      </section>
      {!installed&&<section className="install-guides" aria-label={t('guides')}>
        {devices.map(device=><article className="install-guide" key={device} aria-labelledby={`guide-${device}`}>
          <div className="install-guide-heading"><span className="section-icon" aria-hidden="true">{device==='ios'?<Share/>:<Smartphone/>}</span><div><h2 id={`guide-${device}`}>{t(`${device}Title`)}</h2><p>{t(`${device}Browser`)}</p></div></div>
          <ol>{[1,2,3].map(step=><li key={step}>{t(`${device}Step${step}`)}</li>)}</ol>
          <p className="install-guide-note">{t(`${device}Note`)}</p>
        </article>)}
      </section>}
      <div className="install-details">
        <p><MonitorSmartphone aria-hidden="true"/>{t('standaloneBenefit')}</p>
        <p><Wifi aria-hidden="true"/>{t('connection')}</p>
        <p><Globe aria-hidden="true"/>{t('browserHint')}</p>
      </div>
      <div className="install-continue"><Link className="button secondary" href={`/${locale}`}>{t('continue')}</Link></div>
    </main>
  </div>;
}
