'use client';
import {useEffect, useRef} from 'react';

export function Modal({open, onClose, pending = false, className, labelledBy, describedBy, alert = false, children}: {
  open: boolean; onClose: () => void; pending?: boolean; className: string;
  labelledBy: string; describedBy?: string; alert?: boolean; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const launcher = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    dialog.querySelector<HTMLElement>('[data-dialog-autofocus]')?.focus();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (launcher?.isConnected && launcher !== document.body) launcher.focus();
      else document.querySelector<HTMLElement>('[aria-current="page"]')?.focus();
    };
  }, [open]);

  return <dialog ref={ref} className={`modal-layer ${className}`} role={alert ? 'alertdialog' : 'dialog'} aria-modal="true" aria-labelledby={labelledBy} aria-describedby={describedBy}
    onCancel={event => {event.preventDefault(); if (!pending) onClose();}}
    onClick={event => {if (event.target === event.currentTarget && !pending && !alert) onClose();}}>
    {open && children}
  </dialog>;
}
