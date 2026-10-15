'use client';
import {BrandLogo} from '@/components/brand-logo';
import {zodResolver} from '@hookform/resolvers/zod';
import {useParams, useRouter} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import {api} from '@/lib/api';
const schema = z.object({name: z.string().trim().min(2).max(120)}); type Values = z.infer<typeof schema>;
export default function CreateHomePage() {
  const t = useTranslations('createHome'); const {locale} = useParams<{locale:string}>(); const router = useRouter();
  const {register, handleSubmit, setError, formState:{errors,isSubmitting}} = useForm<Values>({resolver:zodResolver(schema)});
  const submit = handleSubmit(async values => {try {await api('/households',{method:'POST',body:JSON.stringify(values)});router.replace(`/${locale}/family?invite=1`);} catch(error){setError('root',{message:error instanceof Error?error.message:'Unable to create home'});}});
  return <main className="onboarding-page"><section className="onboarding-card"><BrandLogo className="onboarding-brand"/><p className="eyebrow">{t('eyebrow')}</p><h1>{t('title')}</h1><p className="intro">{t('body')}</p><form onSubmit={submit}><div className="field"><label htmlFor="home-name">{t('label')}</label><input id="home-name" className="input" autoFocus placeholder={t('placeholder')} {...register('name')}/>{errors.name&&<p className="field-error">{errors.name.message}</p>}</div>{errors.root&&<p className="field-error">{errors.root.message}</p>}<button className="button full" disabled={isSubmitting}>{isSubmitting?t('creating'):t('button')}</button><p className="form-hint">{t('hint')}</p></form></section></main>;
}
