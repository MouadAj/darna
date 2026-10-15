'use client';
import {CheckCircle2, MailCheck} from 'lucide-react';
import Link from 'next/link';
import {useParams, useSearchParams} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {Suspense, useState} from 'react';
import {AuthCard} from '@/components/auth-ui';
import {api} from '@/lib/api';

function CheckEmailContent(){
  const t=useTranslations('auth');const {locale}=useParams<{locale:string}>();const search=useSearchParams();const email=search.get('email')??'';
  const [devUrl,setDevUrl]=useState<string|null>(()=>search.get('developmentUrl'));const [message,setMessage]=useState<string|null>(null);const [pending,setPending]=useState(false);
  const resend=async()=>{setPending(true);setMessage(null);try{const result=await api<{developmentUrl?:string}>('/auth/resend-verification',{method:'POST',body:JSON.stringify({email,locale})});setMessage(t('resent'));setDevUrl(result.developmentUrl??null);}catch(error){setMessage(error instanceof Error?error.message:t('genericError'));}finally{setPending(false);}};
  return <AuthCard eyebrow={t('checkEyebrow')} title={t('checkTitle')} intro={t('checkIntro',{email})}><div className="auth-status"><MailCheck/><p>{t('checkSpam')}</p></div>{message&&<p className="form-hint" role="status"><CheckCircle2/> {message}</p>}{devUrl&&<a className="button soft full" href={devUrl}>{t('openDevelopmentLink')}</a>}<button className="text-button full" disabled={pending||!email} onClick={resend}>{pending?t('resending'):t('resend')}</button><Link className="text-button auth-back" href={`/${locale}/login`}>{t('backToLogin')}</Link></AuthCard>;
}
export default function CheckEmailPage(){return <Suspense><CheckEmailContent/></Suspense>}
