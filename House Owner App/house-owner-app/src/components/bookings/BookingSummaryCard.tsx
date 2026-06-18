import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatusPill } from '@/components/ui/StatusPill';
import { formatSessionSlotsLabel } from '@/lib/timeSlots';
import { localizedSkillLabel } from '@/lib/skills';
import { formatDate, formatDateShort, formatCurrency } from '@/lib/i18n/format';
import i18n from '@/lib/i18n';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';

export type BookingSummary = {
  id: number;
  status: string;
  bookingType: string;
  requestedSkill?: string | null;
  sessionDate?: string | null;
  sessionStartTime?: string | null;
  sessionEndTime?: string | null;
  sessionSlots?: string | null;
  createdAt?: string;
  caregiver?: { user: { name: string }; verificationStatus?: string } | null;
  totalAmount?: number | null;
  address?: string | null;
};

type Skill = { code: string; label: string };

export function formatBookingWhen(booking: BookingSummary) {
  const slotLabel = formatSessionSlotsLabel(
    booking.sessionSlots,
    booking.sessionStartTime,
    booking.sessionEndTime,
  );
  if (booking.sessionDate && slotLabel) {
    const date = formatDate(booking.sessionDate);
    return `${date} · ${slotLabel}`;
  }
  if (booking.createdAt) {
    return i18n.t('common.requested', { date: formatDateShort(booking.createdAt) });
  }
  return null;
}

export function BookingSummaryCard({
  booking,
  skills = [],
  onPress,
}: {
  booking: BookingSummary;
  skills?: Skill[];
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const helperName = booking.caregiver?.user?.name;
  const category = booking.requestedSkill
    ? localizedSkillLabel(booking.requestedSkill, skills)
    : null;
  const when = formatBookingWhen(booking);
  const visitType =
    booking.bookingType === 'SESSION' ? t('common.oneVisit') : t('common.monthly');
  const canTrack = ['CONFIRMED', 'ACTIVE'].includes(booking.status);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <GlassCard style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.avatar}>
            <MaterialIcons
              name={helperName ? 'person' : 'hourglass-top'}
              size={22}
              color={Stitch.colors.primary}
            />
          </View>
          <View style={styles.body}>
            <View style={styles.helperNameRow}>
              <Text style={styles.helperName} numberOfLines={1}>
                {helperName || t('common.waitingHelper')}
              </Text>
              {helperName &&
              (booking.caregiver?.verificationStatus === 'VERIFIED' ||
                !booking.caregiver?.verificationStatus) ? (
                <VerifiedBadge />
              ) : null}
            </View>
            <Text style={styles.meta}>
              {[category, visitType].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <StatusPill status={booking.status} />
        </View>

        {when ? (
          <View style={styles.detailRow}>
            <MaterialIcons name="schedule" size={16} color={Stitch.colors.secondary} />
            <Text style={styles.detailText}>{when}</Text>
          </View>
        ) : null}

        {booking.address ? (
          <View style={styles.detailRow}>
            <MaterialIcons name="location-on" size={16} color={Stitch.colors.onSurfaceVariant} />
            <Text style={styles.detailText} numberOfLines={1}>
              {booking.address}
            </Text>
          </View>
        ) : null}

        {booking.totalAmount != null ? (
          <Text style={styles.amount}>
            {t('common.rupee')}
            {formatCurrency(booking.totalAmount)}
          </Text>
        ) : null}

        {canTrack ? (
          <View style={styles.trackRow}>
            <MaterialIcons name="my-location" size={16} color={Stitch.colors.secondary} />
            <Text style={styles.trackText}>{t('bookings.tapTrack')}</Text>
            <MaterialIcons name="chevron-right" size={18} color={Stitch.colors.secondary} />
          </View>
        ) : null}
      </GlassCard>
    </TouchableOpacity>
  );
}

const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'ACTIVE'];
const RECENT_STATUSES = ['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'];

export function splitBookings(bookings: BookingSummary[]) {
  const active = bookings.filter((b) => ACTIVE_STATUSES.includes(b.status));
  const recent = bookings.filter((b) => RECENT_STATUSES.includes(b.status));
  return { active, recent };
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Stitch.colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0, paddingRight: 4 },
  helperNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap' },
  helperName: { fontSize: 17, fontWeight: '700', color: Stitch.colors.onBackground, flexShrink: 1 },
  meta: { fontSize: 13, color: Stitch.colors.onSurfaceVariant, marginTop: 3 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  detailText: {
    flex: 1,
    fontSize: 13,
    color: Stitch.colors.onSurfaceVariant,
  },
  amount: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '700',
    color: Stitch.colors.secondary,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Stitch.colors.outlineVariant,
  },
  trackText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Stitch.colors.secondary,
  },
});
