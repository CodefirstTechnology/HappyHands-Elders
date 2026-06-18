import i18n from '@/lib/i18n';
import { getIntlLocale } from '@/lib/i18n';

const formatHour12Locale = (hour24: number) => {
  const d = new Date(2000, 0, 1, hour24, 0, 0, 0);
  return d.toLocaleTimeString(getIntlLocale(i18n.language), {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export const localizedTimeSlotLabel = (start: string, end: string) => {
  const startHour = parseInt(start.split(':')[0], 10);
  const endHour = parseInt(end.split(':')[0], 10);
  if (Number.isNaN(startHour) || Number.isNaN(endHour)) return `${start} – ${end}`;
  return i18n.t('timeSlots.range', { start: formatHour12Locale(startHour), end: formatHour12Locale(endHour) });
};

export const formatTimeSlotLabel = (start?: string | null, end?: string | null) => {
  if (!start || !end) return null;
  return localizedTimeSlotLabel(start, end);
};

export const parseSessionSlots = (raw?: string | null) => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((slot) => slot?.start && slot?.end);
  } catch {
    return [];
  }
};

export const formatSessionSlotsLabel = (
  sessionSlots?: string | null,
  start?: string | null,
  end?: string | null,
) => {
  const slots = parseSessionSlots(sessionSlots);
  if (slots.length > 0) {
    return slots
      .map((slot) => formatTimeSlotLabel(slot.start, slot.end))
      .filter(Boolean)
      .join(', ');
  }
  const single = formatTimeSlotLabel(start, end);
  return single || null;
};
