'use client';
import {AlertCircle, CheckCircle2, Clock3} from 'lucide-react';
import {useTranslations} from 'next-intl';
import type {ItemStatus} from '@housefamily/shared';
export function StatusSelector({value, onChange, disabled}: {value: ItemStatus; onChange: (status: ItemStatus) => void; disabled?: boolean}) {
  const t = useTranslations('status');
  const common = useTranslations('common');
  const options: Array<{status: ItemStatus; Icon: typeof CheckCircle2}> = [{status: 'AVAILABLE', Icon: CheckCircle2}, {status: 'LOW', Icon: Clock3}, {status: 'NEEDED', Icon: AlertCircle}];
  return <div className="status-selector" role="group" aria-label={common('itemStatus')}>{options.map(({status, Icon}) => <button type="button" aria-pressed={value === status} key={status} disabled={disabled} className={`status-choice status-${status.toLowerCase()} ${value === status ? 'selected' : ''}`} onClick={() => onChange(status)}><Icon aria-hidden="true"/><span>{t(status)}</span></button>)}</div>;
}
