import {fireEvent, render, screen} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {describe, expect, it, vi} from 'vitest';
import {StatusSelector} from './status-selector';

const messages = {common: {itemStatus: 'Item status'}, status: {AVAILABLE: 'We have it', LOW: 'Almost finished', NEEDED: 'We need it'}};

describe('StatusSelector', () => {
  it('offers labeled status actions and reports the selected status', () => {
    const change = vi.fn();
    render(<NextIntlClientProvider locale="en" messages={messages}><StatusSelector value="AVAILABLE" onChange={change}/></NextIntlClientProvider>);
    fireEvent.click(screen.getByRole('button', {name: 'We need it'}));
    expect(change).toHaveBeenCalledWith('NEEDED');
    expect(screen.getByRole('button', {name: 'We have it'})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', {name: 'Almost finished'})).toBeVisible();
  });
});
