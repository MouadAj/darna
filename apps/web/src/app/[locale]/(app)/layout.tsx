import {Suspense} from 'react';
import {AppShell} from '@/components/app-shell';
import {BrandLogo} from '@/components/brand-logo';
import {LoadingState} from '@/components/ui';
export default function ProtectedLayout({children}: {children: React.ReactNode}) {
  return <Suspense fallback={<main className="boot-screen"><BrandLogo className="boot-brand"/><LoadingState rows={3}/></main>}><AppShell>{children}</AppShell></Suspense>;
}
