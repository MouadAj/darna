'use client';
import {BrandLogo} from '@/components/brand-logo';
import {Eye, EyeOff, LockKeyhole} from 'lucide-react';
import Link from 'next/link';
import {useTranslations} from 'next-intl';
import {useState} from 'react';

export function AuthCard({eyebrow, title, intro, children}: {eyebrow: string; title: string; intro: string; children: React.ReactNode}) {
  const t=useTranslations('welcome');
  return <main className="onboarding-page"><section className="onboarding-card auth-card"><BrandLogo className="onboarding-brand"/><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="intro">{intro}</p>{children}<p className="privacy-note"><LockKeyhole aria-hidden="true"/>{t('private')}</p></section></main>;
}

export function PasswordField({id, label, error, autoComplete, registration}: {id: string; label: string; error?: string; autoComplete: string; registration: React.InputHTMLAttributes<HTMLInputElement>}) {
  const [visible, setVisible] = useState(false);
  return <div className="field"><label htmlFor={id}>{label}</label><div className="password-wrap"><input {...registration} className="input" id={id} type={visible ? 'text' : 'password'} autoComplete={autoComplete}/><button type="button" className="password-toggle" onClick={()=>setVisible(value=>!value)} aria-label={label}>{visible?<EyeOff/>:<Eye/>}</button></div>{error&&<p className="field-error">{error}</p>}</div>;
}

export function AuthSwitch({text, href, label}: {text: string; href: string; label: string}) {
  return <p className="auth-switch">{text} <Link href={href}>{label}</Link></p>;
}
