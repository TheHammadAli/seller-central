import { t } from '../i18n';

const MONTHS = [
  t('Jan'),
  t('Feb'),
  t('Mar'),
  t('Apr'),
  t('May'),
  t('Jun'),
  t('Jul'),
  t('Aug'),
  t('Sep'),
  t('Oct'),
  t('Nov'),
  t('Dec'),
];

/** "Rs 1,250" — whole rupees, as Fazl stores prices. */
export function formatRs(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const digits = Math.round(Math.abs(amount))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}${t('Rs')} ${digits}`;
}

/** 12,400 → "12.4k", for tight stat tiles. */
export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${trim(n / 1_000_000)}M`;
  if (n >= 1_000) return `${trim(n / 1_000)}k`;
  return String(n);
}

function trim(n: number): string {
  return n.toFixed(1).replace(/\.0$/, '');
}

/** "6 Oct 2026" */
export function formatDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "6 Oct" */
export function formatDayMonth(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "10:45 AM" */
export function formatTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
}

/** "6 Oct, 10:45 AM" */
export function formatDateTime(iso: string): string {
  return `${formatDayMonth(iso)}, ${formatTime(iso)}`;
}

/** "Just now", "12 min ago", "3 h ago", "2 days ago", else the date. */
export function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return t('Just now');
  if (mins < 60) return t('{count} min ago', { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('{count} h ago', { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t(days === 1 ? '{count} day ago' : '{count} days ago', { count: days });
  return formatDate(iso);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function percent(part: number, whole: number): string {
  if (!whole) return '0%';
  return `${trim((part / whole) * 100)}%`;
}
