export type NeedsStatus = 'NEEDED' | 'LOW';

export function readNeedsStatus(value: string | null): NeedsStatus | null {
  return value === 'NEEDED' || value === 'LOW' ? value : null;
}

export function needsHref(locale: string, search = '', changes: {status?: NeedsStatus | null; add?: boolean} = {}) {
  const params = new URLSearchParams(search);
  if ('status' in changes) {
    if (changes.status) params.set('status', changes.status);
    else params.delete('status');
  }
  if ('add' in changes) {
    if (changes.add) params.set('add', '1');
    else params.delete('add');
  }
  const query = params.toString();
  return `/${locale}/needs${query ? `?${query}` : ''}`;
}
