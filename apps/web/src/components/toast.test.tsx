import {act, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {renderWithProviders} from '@/test-utils';
import {ToastProvider, useToast} from './toast';
import {NextIntlClientProvider} from 'next-intl';
import arabic from '../../messages/ar.json';

function Actions() {const toast=useToast();return <><button onClick={()=>toast.show('First change saved')}>First</button><button onClick={()=>toast.show('Second change saved')}>Second</button></>;}
afterEach(()=>vi.useRealTimers());

describe('toast feedback',()=>{
  it('gives the latest message its full display time',()=>{
    vi.useFakeTimers();renderWithProviders(<Actions/>);
    fireEvent.click(screen.getByRole('button',{name:'First'}));act(()=>vi.advanceTimersByTime(4000));
    fireEvent.click(screen.getByRole('button',{name:'Second'}));act(()=>vi.advanceTimersByTime(1000));
    expect(screen.getByText('Second change saved')).toBeVisible();
    act(()=>vi.advanceTimersByTime(4000));expect(screen.queryByText('Second change saved')).not.toBeInTheDocument();
  });
  it('can be dismissed and clears the outstanding timer on unmount',()=>{
    vi.useFakeTimers();const view=renderWithProviders(<Actions/>);
    fireEvent.click(screen.getByRole('button',{name:'First'}));fireEvent.click(screen.getByRole('button',{name:'Dismiss notification'}));
    expect(screen.queryByText('First change saved')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Second'}));const before=vi.getTimerCount();view.unmount();expect(vi.getTimerCount()).toBeLessThan(before);
  });
});

it('uses the Arabic locale and direction for notification feedback outside the page container',()=>{
  render(<NextIntlClientProvider locale="ar" messages={arabic}><ToastProvider><Actions/></ToastProvider></NextIntlClientProvider>);
  fireEvent.click(screen.getByRole('button',{name:'First'}));
  expect(screen.getByRole('status')).toHaveAttribute('lang','ar');expect(screen.getByRole('status')).toHaveAttribute('dir','rtl');
});
