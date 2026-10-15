'use client';
import {zodResolver} from '@hookform/resolvers/zod';
import {useParams, useRouter} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import {AuthCard, AuthSwitch, PasswordField} from '@/components/auth-ui';
import {api} from '@/lib/api';
import type {Locale} from '@housefamily/shared';

const schema = z.object({email: z.email(), password: z.string().min(8).max(128)});
type Values = z.infer<typeof schema>;

export default function LoginPage() {
  const t = useTranslations('auth');
  const {locale} = useParams<{locale: string}>();
  const router = useRouter();
  const {register, handleSubmit, setError, getValues, formState: {errors, isSubmitting}} = useForm<Values>({resolver: zodResolver(schema)});
  const submit = handleSubmit(async (values) => {
    try {
      const result = await api<{preferredLocale: Locale}>('/auth/login', {method: 'POST', body: JSON.stringify(values)});
      router.replace(`/${result.preferredLocale}`);
    } catch (error) {
      setError('root', {message: error instanceof Error ? error.message : t('genericError')});
    }
  });
  const resend = () => router.push(`/${locale}/auth/check-email?email=${encodeURIComponent(getValues('email') ?? '')}`);

  return <AuthCard eyebrow={t('loginEyebrow')} title={t('loginTitle')} intro={t('loginIntro')}>
    <form method="post" onSubmit={submit} noValidate>
      <div className="field"><label htmlFor="email">{t('email')}</label><input className="input" id="email" type="email" inputMode="email" autoComplete="email" {...register('email')}/>{errors.email&&<p className="field-error">{t('emailError')}</p>}</div>
      <PasswordField id="password" label={t('password')} autoComplete="current-password" registration={register('password')} error={errors.password?t('passwordError'):undefined}/>
      {errors.root&&<div className="auth-error" role="alert"><p className="field-error">{errors.root.message}</p>{errors.root.message?.toLowerCase().includes('confirm')&&<button type="button" className="text-button" onClick={resend}>{t('resend')}</button>}</div>}
      <button type="submit" className="button full" disabled={isSubmitting}>{isSubmitting?'…':t('login')}</button>
    </form>
    <AuthSwitch text={t('newHere')} href={`/${locale}/register`} label={t('createAccount')}/>
  </AuthCard>;
}
