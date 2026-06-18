import i18n from '@/lib/i18n';

export type NotificationPayload = {
  title: string;
  body: string;
  type: string;
  data?: Record<string, unknown> | null;
};

/** Localize in-app / push notification title and body from server type keys. */
export function localizeNotification(n: NotificationPayload): { title: string; body: string } {
  const base = `pushNotifications.${n.type}`;
  if (!i18n.exists(`${base}.title`)) {
    return { title: n.title, body: n.body };
  }

  const title = i18n.t(`${base}.title`);
  const helperName =
    (n.data && typeof n.data === 'object' && ('helperName' in n.data ? n.data.helperName : n.data.name)) ||
    undefined;

  if (n.type === 'BOOKING_CONFIRMED' && helperName && i18n.exists(`${base}.bodyNamed`)) {
    return { title, body: i18n.t(`${base}.bodyNamed`, { name: helperName }) };
  }

  if (n.type === 'WORK_START_OTP') {
    const otp =
      n.data && typeof n.data === 'object' && 'otp' in n.data ? String(n.data.otp) : '';
    if (otp && i18n.exists(`${base}.bodyWithOtp`)) {
      return {
        title,
        body: i18n.t(`${base}.bodyWithOtp`, { otp, name: helperName || '' }),
      };
    }
  }

  const body = i18n.exists(`${base}.body`) ? i18n.t(`${base}.body`) : n.body;
  return { title, body };
}
