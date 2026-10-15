'use client';
import {BrandLogo} from '@/components/brand-logo';
import {ListChecks, LockKeyhole, ShoppingBasket, UsersRound} from 'lucide-react';
import Link from 'next/link';
import {useParams, useRouter} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {useState} from 'react';
import {api} from '@/lib/api';
import type {Locale} from '@housefamily/shared';

export default function WelcomePage() {
  const t = useTranslations('welcome'); const {locale}=useParams<{locale:string}>(); const router=useRouter();
  const [demoPending,setDemoPending]=useState(false); const [error,setError]=useState<string|null>(null);
  const demo=async()=>{setDemoPending(true);setError(null);try{const result=await api<{preferredLocale:Locale}>('/auth/dev-login',{method:'POST',body:JSON.stringify({email:'mouad@housefamily.local'})});router.push(`/${result.preferredLocale}`);}catch(value){setError(value instanceof Error?value.message:t('demoUnavailable'));setDemoPending(false);}};
  return <main className="welcome-page"><aside className="welcome-visual" aria-hidden="true"><p className="welcome-quote">“The little things a home needs should never become a big conversation.”</p><div className="welcome-benefits"><div className="welcome-benefit"><span><ListChecks/></span>{t('benefit1')}</div><div className="welcome-benefit"><span><ShoppingBasket/></span>{t('benefit2')}</div><div className="welcome-benefit"><span><UsersRound/></span>{t('benefit3')}</div></div></aside><section className="welcome-main"><BrandLogo className="welcome-brand"/><p className="eyebrow">{t('eyebrow')}</p><h1>{t('title')}</h1><p className="welcome-lead">{t('body')}</p><div className="welcome-form auth-actions"><Link className="button full" href={`/${locale}/register`}>{t('createAccount')}</Link><Link className="button secondary full" href={`/${locale}/login`}>{t('login')}</Link><button type="button" className="text-button full" disabled={demoPending} onClick={demo}>{demoPending?'…':t('demo')}</button>{error&&<p className="field-error" role="alert">{error}</p>}</div><p className="privacy-note"><LockKeyhole aria-hidden="true"/>{t('private')}</p><div className="language-links"><Link className={locale==='en'?'active':''} href="/en/welcome">EN</Link><Link className={locale==='fr'?'active':''} href="/fr/welcome">FR</Link><Link className={locale==='ar'?'active':''} href="/ar/welcome">ع</Link></div></section></main>;
}
