'use client';
import {AlertCircle, CheckCircle2, ChevronLeft, Circle, Clock3, X} from 'lucide-react';
import Link from 'next/link';
import {useTranslations} from 'next-intl';
import type {ItemStatus, Priority} from '@housefamily/shared';

export function PageHeader({title, subtitle, backHref, action}: {title: string; subtitle?: string; backHref?: string; action?: React.ReactNode}) {
  const t = useTranslations('common');
  return <header className="page-header">{backHref && <Link className="back-link" href={backHref}><ChevronLeft aria-hidden="true"/><span>{t('back')}</span></Link>}<div className="page-title-row"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action}</div></header>;
}

export function StatusBadge({status}: {status: ItemStatus}) {
  const t = useTranslations('status');
  const Icon = status === 'AVAILABLE' ? CheckCircle2 : status === 'LOW' ? Clock3 : AlertCircle;
  return <span className={`status-badge status-${status.toLowerCase()}`}><Icon aria-hidden="true"/>{t(status)}</span>;
}

export function PriorityBadge({priority}: {priority: Priority}) {
  const t = useTranslations('priority');
  if (priority === 'NORMAL') return null;
  return <span className={`priority-badge priority-${priority.toLowerCase()}`}><Circle fill="currentColor" aria-hidden="true"/>{t(priority)}</span>;
}

export function EmptyState({icon, title, body, action}: {icon?: React.ReactNode; title: string; body: string; action?: React.ReactNode}) {
  return <div className="empty-state">{icon && <div className="empty-icon">{icon}</div>}<h2>{title}</h2><p>{body}</p>{action}</div>;
}

export function LoadingState({rows = 4}: {rows?: number}) { return <div className="skeleton-stack" aria-label="Loading">{Array.from({length: rows}).map((_, index) => <div className="skeleton-row" key={index}><span/><div><b/><i/></div></div>)}</div>; }

export function ErrorState({message, retry}: {message: string; retry?: () => void}) {
  const t = useTranslations('common');
  return <div className="empty-state error-state"><AlertCircle/><h2>{t('somethingWrong')}</h2><p>{message}</p>{retry && <button className="button secondary" onClick={retry}>{t('tryAgain')}</button>}</div>;
}

export function Sheet({open, onClose, title, children}: {open: boolean; onClose: () => void; title: string; children: React.ReactNode}) {
  const t = useTranslations('common');
  if (!open) return null;
  return <div className="sheet-layer" role="presentation" onMouseDown={(event) => {if (event.target === event.currentTarget) onClose();}}><section className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title"><div className="sheet-handle"/><div className="sheet-header"><h2 id="sheet-title">{title}</h2><button className="icon-label-button" onClick={onClose}><X aria-hidden="true"/><span>{t('close')}</span></button></div><div className="sheet-body">{children}</div></section></div>;
}

export function ConfirmDialog({open, title, body, confirmLabel, onConfirm, onClose, pending}: {open: boolean; title: string; body: string; confirmLabel: string; onConfirm: () => void; onClose: () => void; pending?: boolean}) {
  const t = useTranslations('common');
  if (!open) return null;
  return <div className="dialog-layer"><section className="confirm-dialog" role="alertdialog" aria-modal="true"><h2>{title}</h2><p>{body}</p><div className="dialog-actions"><button className="button secondary" onClick={onClose}>{t('cancel')}</button><button className="button danger" disabled={pending} onClick={onConfirm}>{confirmLabel}</button></div></section></div>;
}
