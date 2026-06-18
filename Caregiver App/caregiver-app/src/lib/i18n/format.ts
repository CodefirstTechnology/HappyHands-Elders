import i18n from '@/lib/i18n';
import { getIntlLocale } from '@/lib/i18n';

export function formatDate(
  value: Date | string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString(getIntlLocale(i18n.language), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  });
}

export function formatDateShort(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString(getIntlLocale(i18n.language), {
    day: 'numeric',
    month: 'short',
  });
}

export function formatTime(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleTimeString(getIntlLocale(i18n.language), {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return value.toLocaleString(getIntlLocale(i18n.language), options);
}

export function formatCurrency(value: number): string {
  return formatNumber(value, { maximumFractionDigits: 0 });
}

export function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return i18n.t('common.justNow');
  if (mins < 60) return i18n.t('common.minutesAgo', { count: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return i18n.t('common.hoursAgo', { count: hrs });
  return formatDateShort(d);
}
