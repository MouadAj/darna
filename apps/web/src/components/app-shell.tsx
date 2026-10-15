'use client';
import {useEffect} from 'react';
import {Activity, ChevronRight, Home, ListChecks, Plus, ShoppingBasket, UsersRound, Wrench} from 'lucide-react';
import Link from 'next/link';
import {useParams, usePathname, useRouter, useSearchParams} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {useQuery} from '@tanstack/react-query';
import {api, ApiError} from '@/lib/api';
import type {SessionUser} from '@/lib/types';
import {ActionError, ErrorState, LoadingState} from './ui';
import {BrandLogo} from './brand-logo';
import {needsHref} from '@/lib/needs-filters';

export function AppShell({children}: {children: React.ReactNode}) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const search = useSearchParams();
  const common = useTranslations('common');
  const router = useRouter();
  const {locale} = useParams<{locale: string}>();
  const me = useQuery({queryKey: ['me'], queryFn: () => api<SessionUser>('/auth/me'), retry: false});

  const unauthenticated = me.error instanceof ApiError && me.error.status === 401;
  const addHref = needsHref(locale, pathname === `/${locale}/needs` ? search.toString() : '', {add: true});

  useEffect(() => {
    if (unauthenticated) router.replace(`/${locale}/welcome`);
    else if (me.isSuccess && !me.data.householdId) router.replace(`/${me.data.preferredLocale}/create-home`);
    else if (me.isSuccess && locale !== me.data.preferredLocale) {
      router.replace(pathname.replace(/^\/[^/]+/, `/${me.data.preferredLocale}`));
    }
  }, [locale, me.data, me.isError, me.isSuccess, pathname, router, unauthenticated]);

  if (me.isLoading) return <main className="boot-screen"><BrandLogo className="boot-brand"/><LoadingState rows={3}/></main>;
  if (me.isError && !unauthenticated && !me.data) return <main className="boot-screen"><BrandLogo className="boot-brand"/><ErrorState message={common('loadFailed')} retry={()=>void me.refetch()}/></main>;
  if (unauthenticated || !me.data?.householdId) return null;

  const entries = [
    {href: `/${locale}`, label: t('home'), Icon: Home, exact: true},
    {href: `/${locale}/needs`, label: t('needs'), Icon: ListChecks},
    {href: addHref, label: t('add'), Icon: Plus, add: true},
    {href: `/${locale}/activity`, label: t('activity'), Icon: Activity},
    {href: `/${locale}/family`, label: t('family'), Icon: UsersRound},
  ];
  const desktopEntries = [
    {href: `/${locale}`, label: t('home'), Icon: Home, exact: true},
    {href: `/${locale}/needs`, label: t('needs'), Icon: ListChecks},
    {href: `/${locale}/shopping`, label: t('shopping'), Icon: ShoppingBasket},
    {href: `/${locale}/issues`, label: t('issues'), Icon: Wrench},
    {href: `/${locale}/activity`, label: t('activity'), Icon: Activity},
    {href: `/${locale}/family`, label: t('family'), Icon: UsersRound},
  ];
  return <div className="app-frame">
    <aside className="desktop-sidebar">
      <Link href={`/${locale}`} className="sidebar-brand"><BrandLogo/></Link>
      <div className="sidebar-household"><span className="sidebar-house-icon"><Home aria-hidden="true"/></span><span>{me.data.householdName}</span></div>
      <Link href={addHref} className="button sidebar-add"><Plus aria-hidden="true"/>{t('addSomething')}</Link>
      <nav className="sidebar-nav" aria-label={t('primaryNavigation')}>{desktopEntries.map(({href, label, Icon, exact}) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return <Link href={href} key={href} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}><Icon aria-hidden="true"/><span>{label}</span></Link>;
      })}</nav>
      <Link href={`/${locale}/family#account-title`} className="sidebar-account"><span className="avatar">{me.data.name.slice(0, 1).toUpperCase()}</span><span className="sidebar-account-copy"><strong>{me.data.name}</strong><span>{t('yourAccount')}</span></span><ChevronRight aria-hidden="true"/></Link>
    </aside>
    <main className="app-content">{me.isError && <ActionError message={common('loadFailed')} retry={()=>void me.refetch()} pending={me.isFetching}/ >}{children}</main><nav className="bottom-nav" aria-label={t('primaryNavigation')}>{entries.map(({href, label, Icon, exact, add}) => {
    const hrefPath = href.split('?')[0];
    const active = !add && (exact ? pathname === hrefPath : pathname.startsWith(hrefPath));
    return <Link href={href} key={label} className={`${active ? 'active' : ''} ${add ? 'nav-add' : ''}`} aria-current={active ? 'page' : undefined}><span className="nav-icon"><Icon aria-hidden="true"/></span><span>{label}</span></Link>;
  })}</nav></div>;
}
