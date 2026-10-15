import {render} from '@testing-library/react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {NextIntlClientProvider} from 'next-intl';
import messages from '../messages/en.json';
import {ToastProvider} from './components/toast';

export function renderWithProviders(ui: React.ReactNode, client = new QueryClient({defaultOptions: {queries: {retry: false, staleTime: Infinity}, mutations: {retry: false}}})) {
  const result = render(ui, {wrapper: ({children}) => <NextIntlClientProvider locale="en" messages={messages}><QueryClientProvider client={client}><ToastProvider>{children}</ToastProvider></QueryClientProvider></NextIntlClientProvider>});
  return {...result, client};
}
