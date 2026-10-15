'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {ArrowRight, House} from 'lucide-react';
import {BrandLogo} from './brand-logo';

type Copy = {eyebrow: string; title: string; description: string; home: string; hint: string};

export function NotFoundPage({messages}: {messages: Record<'en' | 'fr' | 'ar', Copy>}) {
  const segment = usePathname()?.split('/')[1];
  const locale = segment === 'ar' || segment === 'fr' ? segment : 'en';
  const t = messages[locale];

  return <div className="not-found-page" lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
    <header className="not-found-header"><Link href={`/${locale}`} aria-label={`Darna · ${t.home}`}><BrandLogo/></Link></header>
    <main className="not-found-main">
      <div className="not-found-art" aria-hidden="true" dir="ltr">
        <div className="not-found-orbit"/>
        <span className="not-found-number">404</span>
        <span className="not-found-house"><House aria-hidden="true"/></span>
        <span className="not-found-dot not-found-dot--one"/>
        <span className="not-found-dot not-found-dot--two"/>
      </div>
      <div className="not-found-copy">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p className="not-found-description">{t.description}</p>
        <Link className="button not-found-home" href={`/${locale}`}>{t.home}<ArrowRight aria-hidden="true"/></Link>
        <p className="not-found-hint">{t.hint}</p>
      </div>
    </main>
  </div>;
}
