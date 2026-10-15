'use client';
import {zodResolver} from '@hookform/resolvers/zod';
import {useParams, useRouter} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import {AuthCard, AuthSwitch, PasswordField} from '@/components/auth-ui';
import {api} from '@/lib/api';
import {PendingLabel} from '@/components/loading';
import type {Locale} from '@housefamily/shared';

const schema = z.object({
  name: z.string().trim().min(2),
  email: z.email(),
  password: z.string().min(8).max(128),
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, {path: ['confirmPassword'], message: 'Passwords do not match'});
type Values = z.infer<typeof schema>;

export default function RegisterPage() {
  const t = useTranslations('auth');
  const {locale} = useParams<{locale: string}>();
  const router = useRouter();
  const {register, handleSubmit, setError, formState: {errors, isSubmitting}} = useForm<Values>({resolver: zodResolver(schema)});
  const submit = handleSubmit(async (values) => {
    try {
      const result = await api<{preferredLocale: Locale}>('/auth/register', {method: 'POST', body: JSON.stringify({name: values.name, email: values.email, password: values.password, locale})});
      router.replace(`/${result.preferredLocale}`);
    } catch (error) {
      setError('root', {message: error instanceof Error ? error.message : t('genericError')});
    }
  });

  return <AuthCard eyebrow={t('registerEyebrow')} title={t('registerTitle')} intro={t('registerIntro')}>
    <form method="post" onSubmit={submit} noValidate>
      <div className="field"><label htmlFor="name">{t('name')}</label><input className="input" id="name" autoComplete="name" {...register('name')}/>{errors.name&&<p className="field-error">{t('nameError')}</p>}</div>
      <div className="field"><label htmlFor="email">{t('email')}</label><input className="input" id="email" type="email" inputMode="email" autoComplete="email" {...register('email')}/>{errors.email&&<p className="field-error">{t('emailError')}</p>}</div>
      <PasswordField id="password" label={t('password')} autoComplete="new-password" registration={register('password')} error={errors.password?t('passwordError'):undefined}/>
      <PasswordField id="confirm-password" label={t('confirmPassword')} autoComplete="new-password" registration={register('confirmPassword')} error={errors.confirmPassword?t('passwordMismatch'):undefined}/>
      {errors.root&&<p className="field-error" role="alert">{errors.root.message}</p>}
      <button type="submit" className="button full" disabled={isSubmitting}><PendingLabel pending={isSubmitting}>{isSubmitting?t('creatingAccount'):t('createAccount')}</PendingLabel></button>
    </form>
    <AuthSwitch text={t('haveAccount')} href={`/${locale}/login`} label={t('login')}/>
  </AuthCard>;
}
