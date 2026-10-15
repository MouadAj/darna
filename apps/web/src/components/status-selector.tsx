'use client';
import {useTranslations} from 'next-intl';
import type {ItemStatus} from '@housefamily/shared';
import {StatusIcon} from './status-icon';
export function StatusSelector({value, onChange, disabled}: {value: ItemStatus; onChange: (status: ItemStatus) => void; disabled?: boolean}) {
  const t = useTranslations('status');
  const common = useTranslations('common');
  const options: ItemStatus[] = ['AVAILABLE', 'LOW', 'NEEDED'];
  return <div className="status-selector" role="group" aria-label={common('itemStatus')}>{options.map(status => <button type="button" aria-pressed={value === status} key={status} disabled={disabled} className={`status-choice status-${status.toLowerCase()} ${value === status ? 'selected' : ''}`} onClick={() => onChange(status)}><StatusIcon status={status}/><span>{t(status)}</span></button>)}</div>;
}
