'use client';
import {BrandLogo} from '@/components/brand-logo';
import {zodResolver} from '@hookform/resolvers/zod';
import {useParams, useRouter} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {useForm} from 'react-hook-form';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {useEffect, useRef, useState} from 'react';
import {z} from 'zod';
import {api, ApiError} from '@/lib/api';
import type {SessionUser} from '@/lib/types';
import {useToast} from '@/components/toast';
import {ErrorState} from '@/components/ui';
import {PendingLabel, SessionLoader} from '@/components/loading';

const schema=z.object({name:z.string().trim().min(2).max(120)});
type Values=z.infer<typeof schema>;
export default function CreateHomePage() {
  const t=useTranslations('createHome');const common=useTranslations('common');
  const {locale}=useParams<{locale:string}>();const router=useRouter();const client=useQueryClient();const toast=useToast();
  const me=useQuery({queryKey:['me'],queryFn:()=>api<SessionUser>('/auth/me'),refetchOnMount:'always',retry:false});
  const [created,setCreated]=useState(false);const busy=useRef(false);const finished=useRef(false);
  const [phase,setPhase]=useState<'idle'|'creating'|'opening'|'recovery'|'done'>('idle');
  const {register,handleSubmit,setError,formState:{errors}}=useForm<Values>({resolver:zodResolver(schema)});
  const unauthenticated=me.error instanceof ApiError&&me.error.status===401;
  useEffect(()=>{
    if(unauthenticated)router.replace(`/${locale}/login`);
    else if(me.isFetchedAfterMount&&me.data?.householdId&&!created)router.replace(`/${me.data.preferredLocale}`);
  },[created,locale,me.data,me.isFetchedAfterMount,router,unauthenticated]);

  const openHome=async()=>{
    setPhase('opening');
    try {
      await client.cancelQueries({queryKey:['me']});
      const session=await me.refetch({throwOnError:true});
      if(!session.data?.householdId)throw new Error('Household session is not ready');
      finished.current=true;setPhase('done');toast.show(t('success'));
      router.replace(`/${session.data.preferredLocale}`);
    } catch {setPhase('recovery');}
  };
  const submit=async(values:Values)=>{
    if(busy.current||created||finished.current)return;
    busy.current=true;setPhase('creating');
    try {
      await api('/households',{method:'POST',body:JSON.stringify(values)});
      setCreated(true);
    } catch(error) {
      setError('root',{message:error instanceof Error?error.message:t('failed')});
      setPhase('idle');busy.current=false;return;
    }
    await openHome();busy.current=false;
  };
  const retry=async()=>{if(busy.current||finished.current)return;busy.current=true;await openHome();busy.current=false;};
  if(unauthenticated||(!created&&(!me.isFetchedAfterMount||Boolean(me.data?.householdId))))return <SessionLoader/>;
  if(me.isError&&!created)return <main className="onboarding-page"><section className="onboarding-card"><BrandLogo/><ErrorState message={common('loadFailed')} retry={()=>void me.refetch()}/></section></main>;
  const pending=phase==='creating'||phase==='opening'||phase==='done';
  return <main className="onboarding-page"><section className="onboarding-card"><BrandLogo className="onboarding-brand"/><p className="eyebrow">{t('eyebrow')}</p><h1>{t('title')}</h1><p className="intro">{t('body')}</p>
    {created?<div className="home-creation-result" aria-busy={pending}>
      {phase==='recovery'?<><p className="form-hint" role="alert">{t('recovery')}</p><button className="button full" type="button" onClick={()=>void retry()}>{common('tryAgain')}</button></>:<p className="creation-progress" role="status"><PendingLabel pending>{phase==='done'?t('success'):t('opening')}</PendingLabel></p>}
    </div>:<form method="post" onSubmit={event=>void handleSubmit(submit)(event)} noValidate aria-busy={pending}>
      <div className="field"><label htmlFor="home-name">{t('label')}</label><input id="home-name" className="input" autoFocus placeholder={t('placeholder')} disabled={pending} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name?'home-name-error':undefined} {...register('name')}/>{errors.name&&<p id="home-name-error" className="field-error" role="alert">{t('nameError')}</p>}</div>
      {errors.root&&<p className="field-error" role="alert">{errors.root.message}</p>}
      <button type="submit" className="button full" disabled={pending}><PendingLabel pending={pending}>{pending?t('creating'):t('button')}</PendingLabel></button><p className="form-hint">{t('hint')}</p>
    </form>}
  </section></main>;
}
