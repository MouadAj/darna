'use client';

import {LoaderCircle} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {BrandLogo} from './brand-logo';

export function Spinner() {
  return <LoaderCircle className="loading-spinner" aria-hidden="true"/>;
}

export function PendingLabel({pending, children}: {pending: boolean; children: React.ReactNode}) {
  return <span className="pending-label">{pending&&<Spinner/>}<span>{children}</span></span>;
}

function LoadingRegion({children, className = ''}: {children: React.ReactNode; className?: string}) {
  const t=useTranslations('common');
  return <div className={`loading-region ${className}`} role="status" aria-live="polite" aria-label={t('loading')} aria-busy="true">
    <span className="sr-only">{t('loading')}</span><div aria-hidden="true">{children}</div>
  </div>;
}

function Line({short = false}: {short?: boolean}) {
  return <span className={`skeleton-shape skeleton-line${short?' short':''}`}/>;
}

function Rows({count = 4}: {count?: number}) {
  return <div className="skeleton-stack">{Array.from({length:count},(_,index)=><div className="skeleton-row" key={index}>
    <span className="skeleton-shape skeleton-avatar"/><div className="skeleton-copy"><Line short/><Line/></div>
  </div>)}</div>;
}

export function LoadingState({rows = 4}: {rows?: number}) {
  return <LoadingRegion><Rows count={rows}/></LoadingRegion>;
}

export type SkeletonPage = 'dashboard'|'needs'|'shopping'|'family'|'activity'|'issues'|'onboarding';

export function PageSkeleton({variant = 'dashboard'}: {variant?: SkeletonPage}) {
  const header=<div className="skeleton-heading"><Line short/><span className="skeleton-shape skeleton-title"/><Line/></div>;
  let content: React.ReactNode;
  switch(variant) {
    case 'dashboard': content=<div className="home-dashboard">
      <div className="summary-grid">{[0,1].map(index=><span key={index} className="skeleton-shape skeleton-summary"/>)}</div>
      <div className="hero-action skeleton-panel"><Line/><span className="skeleton-shape skeleton-button"/></div>
      <section className="home-usual skeleton-panel"><Line short/><div className="usual-grid">{Array.from({length:6},(_,index)=><div key={index} className="skeleton-tile"><span className="skeleton-shape skeleton-avatar"/><Line/></div>)}</div></section>
      <section className="home-needed skeleton-panel"><Line short/><Rows count={3}/></section>
    </div>;break;
    case 'family': content=<div className="family-layout"><Rows/><div className="skeleton-panel skeleton-account"><span className="skeleton-shape skeleton-avatar"/><Line/><Line short/><span className="skeleton-shape skeleton-button"/></div></div>;break;
    case 'activity': content=<div className="activity-layout"><div className="activity-feed"><Rows count={5}/></div><div className="skeleton-panel"><Line short/><Line/><span className="skeleton-shape skeleton-button"/></div></div>;break;
    case 'issues': content=<div className="issues-grid">{[0,1,2].map(index=><div key={index} className="skeleton-panel skeleton-issue"><Rows count={1}/><span className="skeleton-shape skeleton-button"/></div>)}</div>;break;
    case 'needs': content=<><div className="skeleton-chips">{[0,1,2,3].map(index=><span className="skeleton-shape" key={index}/>)}</div><Rows count={5}/></>;break;
    case 'shopping': content=<><span className="skeleton-shape skeleton-progress"/><Rows count={5}/><span className="skeleton-shape skeleton-button"/></>;break;
    case 'onboarding': content=<div className="skeleton-panel"><Line short/><span className="skeleton-shape skeleton-input"/><span className="skeleton-shape skeleton-button"/></div>;break;
  }
  return <LoadingRegion className={`page-skeleton skeleton-${variant}`}>{header}{content}</LoadingRegion>;
}

export function SessionLoader() {
  const t=useTranslations('common');
  return <main className="session-loader"><BrandLogo className="boot-brand"/><p role="status" aria-live="polite" aria-busy="true"><Spinner/>{t('loading')}</p></main>;
}

export function RefreshIndicator({active}: {active: boolean}) {
  const t=useTranslations('common');
  return <div className="refresh-indicator" role="status" aria-live="polite">{active&&<><Spinner/><span>{t('updating')}</span></>}</div>;
}
