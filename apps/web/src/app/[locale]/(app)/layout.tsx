import {Suspense} from 'react';
import {AppShell} from '@/components/app-shell';
import {SessionLoader} from '@/components/loading';
export default function ProtectedLayout({children}: {children: React.ReactNode}) {
  return <Suspense fallback={<SessionLoader/>}><AppShell>{children}</AppShell></Suspense>;
}
