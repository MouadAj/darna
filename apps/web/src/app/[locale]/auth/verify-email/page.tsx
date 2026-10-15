'use client';
import {CheckCircle2, LoaderCircle, XCircle} from 'lucide-react';
import Link from 'next/link';
import {useParams, useRouter, useSearchParams} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {Suspense, useEffect, useState} from 'react';
import {api} from '@/lib/api';
import type {Locale} from '@housefamily/shared';

function VerifyContent(){
  const t=useTranslations('verify');const {locale}=useParams<{locale:string}>();const router=useRouter();const search=useSearchParams();
  const [state,setState]=useState<'loading'|'success'|'error'>(()=>search.get('token')?'loading':'error');
  useEffect(()=>{const token=search.get('token');if(!token)return;void api<{preferredLocale:Locale}>('/auth/verify-email',{method:'POST',body:JSON.stringify({token})}).then(result=>{setState('success');window.setTimeout(()=>router.replace(`/${result.preferredLocale}`),900);}).catch(()=>setState('error'));},[router,search]);
  const Icon=state==='loading'?LoaderCircle:state==='success'?CheckCircle2:XCircle;
  return <main className="onboarding-page"><section className="onboarding-card empty-state"><Icon className={state==='loading'?'spin':''}/><h1>{state==='loading'?t('title'):state==='success'?t('success'):t('invalid')}</h1>{state==='error'&&<Link className="button" href={`/${locale}/login`}>{t('login')}</Link>}</section></main>;
}
export default function VerifyEmailPage(){return <Suspense><VerifyContent/></Suspense>}
