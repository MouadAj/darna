'use client';
import {BrandLogo} from '@/components/brand-logo';
import {zodResolver} from '@hookform/resolvers/zod';
import {LockKeyhole} from 'lucide-react';
import {useMutation, useQuery} from '@tanstack/react-query';
import {useParams, useRouter} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import {PasswordField} from '@/components/auth-ui';
import {ErrorState, LoadingState} from '@/components/ui';
import {api} from '@/lib/api';
import {PendingLabel} from '@/components/loading';
import type {Locale} from '@housefamily/shared';

const schema = z.object({password: z.string().min(8).max(128), confirmPassword: z.string()})
  .refine((value) => value.password === value.confirmPassword, {path: ['confirmPassword'], message: 'Passwords do not match'});
type Values = z.infer<typeof schema>;

export default function InvitationPage() {
  const t = useTranslations('invite');
  const auth = useTranslations('auth');
  const {locale, token} = useParams<{locale: string; token: string}>();
  const router = useRouter();
  const preview = useQuery({queryKey: ['invitation', token], queryFn: () => api<{invitedName: string; householdName: string}>(`/invitations/preview/${token}`), retry: false});
  const {register, handleSubmit, setError, formState: {errors}} = useForm<Values>({resolver: zodResolver(schema)});
  const accept = useMutation({
    mutationFn: (password: string) => api<{preferredLocale: Locale}>('/invitations/accept', {method: 'POST', body: JSON.stringify({token, password, locale})}),
    onSuccess: (result) => router.replace(`/${result.preferredLocale}`),
    onError: (error) => setError('root', {message: error.message}),
  });
  const submit = handleSubmit((values) => accept.mutate(values.password));

  return <main className="onboarding-page"><section className="onboarding-card">
    {preview.isLoading?<LoadingState rows={3}/>:preview.isError?<ErrorState message={t('invalid')}/>:<>
      <BrandLogo className="onboarding-brand"/><p className="eyebrow">{t('hello',{name:preview.data!.invitedName})}</p><h1>{t('title',{household:preview.data!.householdName})}</h1><p className="intro">{t('body')}</p>
      <form method="post" onSubmit={submit}><PasswordField id="invite-password" label={t('password')} autoComplete="new-password" registration={register('password')} error={errors.password?auth('passwordError'):undefined}/><PasswordField id="invite-confirm-password" label={t('confirmPassword')} autoComplete="new-password" registration={register('confirmPassword')} error={errors.confirmPassword?auth('passwordMismatch'):undefined}/>{errors.root&&<p className="field-error" role="alert">{errors.root.message}</p>}<button type="submit" className="button full" disabled={accept.isPending}><PendingLabel pending={accept.isPending}>{accept.isPending?t('joining'):t('accept')}</PendingLabel></button></form>
      <p className="privacy-note"><LockKeyhole/>{t('secure')}</p>
    </>}
  </section></main>;
}
