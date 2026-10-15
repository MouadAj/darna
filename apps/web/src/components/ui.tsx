'use client';
import {AlertCircle, ChevronLeft, Clock3, Flag, X} from 'lucide-react';
import Link from 'next/link';
import {useTranslations} from 'next-intl';
import {useId} from 'react';
import {Modal} from './modal';
import {PendingLabel} from './loading';
import {issueStatusIcons, StatusIcon} from './status-icon';
import type {IssueStatus, ItemStatus, Priority} from '@housefamily/shared';

export function PageHeader({title, subtitle, backHref, action}: {title: string; subtitle?: string; backHref?: string; action?: React.ReactNode}) {
  const t = useTranslations('common');
  return <header className="page-header">{backHref && <Link className="back-link" href={backHref}><ChevronLeft aria-hidden="true"/><span>{t('back')}</span></Link>}<div className="page-title-row"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action}</div></header>;
}

export function StatusBadge({status}: {status: ItemStatus}) {
  const t = useTranslations('status');
  return <span className={`status-badge status-${status.toLowerCase()}`}><StatusIcon status={status}/>{t(status)}</span>;
}

export function IssueStatusBadge({status}: {status: IssueStatus}) {
  const t = useTranslations('issues');
  const Icon = issueStatusIcons[status];
  return <span className={`status-badge issue-${status.toLowerCase()}`}><Icon aria-hidden="true"/>{t(status)}</span>;
}

export function PriorityBadge({priority}: {priority: Priority}) {
  const t = useTranslations('priority');
  if (priority === 'NORMAL') return null;
  const Icon = priority === 'URGENT' ? Flag : Clock3;
  return <span className={`priority-badge priority-${priority.toLowerCase()}`}><Icon aria-hidden="true"/>{t(priority)}</span>;
}

export function EmptyState({icon, title, body, action}: {icon?: React.ReactNode; title: string; body: string; action?: React.ReactNode}) {
  return <div className="empty-state">{icon && <div className="empty-icon" aria-hidden="true">{icon}</div>}<h2>{title}</h2><p>{body}</p>{action}</div>;
}

export {LoadingState} from './loading';

export function ErrorState({message, retry}: {message: string; retry?: () => void}) {
  const t = useTranslations('common');
  return <div className="empty-state error-state"><AlertCircle aria-hidden="true"/><h2>{t('somethingWrong')}</h2><p>{message}</p>{retry && <button className="button secondary" onClick={retry}>{t('tryAgain')}</button>}</div>;
}

export function ActionError({retry, pending = false, message}: {retry?: () => void; pending?: boolean; message?: string}) {
  const t = useTranslations('common');
  return <div className="action-error" role="alert"><p>{message ?? t('actionFailed')}</p>{retry && <button type="button" className="text-button" disabled={pending} onClick={retry}><PendingLabel pending={pending}>{pending ? t('working') : t('tryAgain')}</PendingLabel></button>}</div>;
}

export function Sheet({open, onClose, title, pending, children}: {open: boolean; onClose: () => void; title: string; pending?: boolean; children: React.ReactNode}) {
  const t = useTranslations('common');
  const titleId = useId();
  return <Modal open={open} onClose={onClose} pending={pending} className="sheet-layer" labelledBy={titleId}><section className="sheet"><div className="sheet-handle"/><div className="sheet-header"><h2 id={titleId} tabIndex={-1} data-dialog-autofocus>{title}</h2><button type="button" className="icon-label-button" disabled={pending} onClick={onClose}><X aria-hidden="true"/><span>{t('close')}</span></button></div><div className="sheet-body">{children}</div></section></Modal>;
}

export function ConfirmDialog({open, title, body, confirmLabel, onConfirm, onClose, pending, children}: {open: boolean; title: string; body: string; confirmLabel: string; onConfirm: () => void; onClose: () => void; pending?: boolean; children?: React.ReactNode}) {
  const t = useTranslations('common');
  const titleId = useId();
  const bodyId = useId();
  return <Modal open={open} onClose={onClose} pending={pending} className="dialog-layer" labelledBy={titleId} describedBy={bodyId} alert><section className="confirm-dialog"><h2 id={titleId}>{title}</h2><p id={bodyId}>{body}</p>{children}<div className="dialog-actions"><button type="button" className="button secondary" disabled={pending} data-dialog-autofocus onClick={onClose}>{t('cancel')}</button><button type="button" className="button danger" disabled={pending} onClick={onConfirm}><PendingLabel pending={Boolean(pending)}>{pending ? t('working') : confirmLabel}</PendingLabel></button></div></section></Modal>;
}
