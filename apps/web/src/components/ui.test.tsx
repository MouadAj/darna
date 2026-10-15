import {fireEvent, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {renderWithProviders} from '@/test-utils';
import {ConfirmDialog, Sheet} from './ui';
import {PasswordField} from './auth-ui';

describe('modal interactions', () => {
  it('focuses the sheet title, locks scrolling, and requests closure on Escape', () => {
    const close=vi.fn();
    const view=renderWithProviders(<Sheet open onClose={close} title="Choose an item"><button>Milk</button></Sheet>);
    const dialog=screen.getByRole('dialog', {name:'Choose an item'});
    expect(screen.getByRole('heading', {name:'Choose an item'})).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent(dialog, new Event('cancel', {cancelable:true}));
    expect(close).toHaveBeenCalledOnce();
    view.unmount();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('restores focus to the launcher when the sheet closes', () => {
    const launcher=document.createElement('button');launcher.textContent='Launch';document.body.append(launcher);launcher.focus();
    const view=renderWithProviders(<Sheet open onClose={()=>{}} title="Choose"><button>Milk</button></Sheet>);
    view.rerender(<Sheet open={false} onClose={()=>{}} title="Choose"><button>Milk</button></Sheet>);
    expect(launcher).toHaveFocus();launcher.remove();
  });

  it('focuses Cancel and blocks dismissal and confirmation while removal is pending', () => {
    const close=vi.fn();const confirm=vi.fn();
    const view=renderWithProviders(<ConfirmDialog open title="Remove access?" body="This member loses access." confirmLabel="Remove" onConfirm={confirm} onClose={close}/>);
    expect(screen.getByRole('button', {name:'Cancel'})).toHaveFocus();
    view.rerender(<ConfirmDialog open pending title="Remove access?" body="This member loses access." confirmLabel="Remove" onConfirm={confirm} onClose={close}/>);
    fireEvent(screen.getByRole('alertdialog'),new Event('cancel',{cancelable:true}));
    fireEvent.click(screen.getByRole('button',{name:'Cancel'}));
    fireEvent.click(screen.getByRole('button',{name:'Please wait…'}));
    expect(close).not.toHaveBeenCalled();expect(confirm).not.toHaveBeenCalled();
  });
});

it('labels password visibility and associates validation feedback with the field',()=>{
  renderWithProviders(<PasswordField id="password" label="Password" autoComplete="new-password" registration={{}} error="Use at least 8 characters"/>);
  const input=screen.getByLabelText('Password');
  expect(input).toHaveAttribute('aria-invalid','true');expect(input).toHaveAccessibleDescription('Use at least 8 characters');
  fireEvent.click(screen.getByRole('button',{name:'Show password'}));expect(input).toHaveAttribute('type','text');
  expect(screen.getByRole('button',{name:'Hide password'})).toHaveAttribute('aria-pressed','true');
});
