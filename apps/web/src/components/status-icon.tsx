import {AlertCircle, CheckCircle2, Clock3, Wrench} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import type {IssueStatus, ItemStatus} from '@housefamily/shared';

export const itemStatusIcons: Record<ItemStatus, LucideIcon> = {
  AVAILABLE: CheckCircle2,
  LOW: Clock3,
  NEEDED: AlertCircle,
};

export const issueStatusIcons: Record<IssueStatus, LucideIcon> = {
  OPEN: AlertCircle,
  IN_PROGRESS: Wrench,
  RESOLVED: CheckCircle2,
};

export function StatusIcon({status}: {status: ItemStatus}) {
  const Icon = itemStatusIcons[status];
  return <Icon aria-hidden="true"/>;
}
