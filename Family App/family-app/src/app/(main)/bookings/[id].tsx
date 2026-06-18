import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TextInput, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import api from '@/lib/api';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatusPill } from '@/components/ui/StatusPill';
import { GradientButton } from '@/components/ui/GradientButton';
import { JobTrackingMap } from '@/components/ui/JobTrackingMap';
import { useBookingTrackingPoll } from '@/hooks/useBookingTrackingPoll';
import { formatSessionSlotsLabel } from '@/lib/timeSlots';
import { VisitAddressBanner } from '@/components/ui/VisitAddressBanner';
import { formatVisitAddressLines } from '@/lib/visitAddress';
import { localizedSkillLabel } from '@/lib/skills';
import { useSkills } from '@/hooks/useSkills';
import { formatDate, formatCurrency } from '@/lib/i18n/format';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';

export default function BookingDetailScreen() {
  const { t } = useTranslation();
  const { data: skills = [] } = useSkills();
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookingId = id ? parseInt(id, 10) : null;
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [elderSafetyRating, setElderSafetyRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get(`/bookings/${id}`);
      return res.data.data.booking;
    },
    refetchInterval: (query) => {
      const b = query.state.data;
      return b?.status === 'PENDING' && !b?.caregiver ? 5000 : false;
    },
  });

  const isOpenBroadcast = booking?.status === 'PENDING' && !booking?.caregiver;

  const { data: areaHelpers = [] } = useQuery({
    queryKey: [
      'servants',
      booking?.requestedSkill,
      booking?.latitude,
      booking?.longitude,
    ],
    enabled:
      isOpenBroadcast &&
      booking?.latitude != null &&
      booking?.longitude != null,
    queryFn: async () => {
      const res = await api.get('/caregivers', {
        params: {
          skill: booking!.requestedSkill || undefined,
          latitude: booking!.latitude,
          longitude: booking!.longitude,
        },
      });
      return res.data.data.caregivers as { user: { name: string } }[];
    },
  });

  const trackLive = ['CONFIRMED', 'ACTIVE'].includes(booking?.status ?? '');
  const { data: tracking } = useBookingTrackingPoll(bookingId, trackLive);

  const home =
    booking?.latitude != null && booking?.longitude != null
      ? { latitude: booking.latitude, longitude: booking.longitude }
      : null;

  const servant = tracking?.caregiver
    ? { latitude: tracking.caregiver.latitude, longitude: tracking.caregiver.longitude }
    : null;
  const helperSharing = Boolean(servant);
  const canTrack = trackLive && home;

  const cancel = async () => {
    try {
      await api.patch(`/bookings/${id}/cancel`);
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['booking', id] });
      Alert.alert(t('bookings.cancelledTitle'), t('bookings.bookingCancelled'));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      Alert.alert(t('bookings.requestFailed'), err.response?.data?.message || t('bookings.couldNotCancel'));
    }
  };

  const submitReview = async () => {
    setSubmittingReview(true);
    try {
      await api.post(`/bookings/${id}/review`, {
        rating,
        elderSafetyRating,
        comment: reviewComment.trim() || undefined,
      });
      qc.invalidateQueries({ queryKey: ['booking', id] });
      Alert.alert(t('bookings.thankYou'), t('bookings.reviewSubmitted'));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      Alert.alert(t('errors.generic'), err.response?.data?.message || t('errors.couldNotSave'));
    } finally {
      setSubmittingReview(false);
    }
  };

  if (isLoading || !booking) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t('common.loading')}</Text>
      </View>
    );
  }

  const statusHint: Record<string, string> = {
    PENDING: booking.caregiver
      ? t('bookings.hintPendingServant')
      : areaHelpers.length > 0
        ? t('bookings.hintPendingBroadcast', { count: areaHelpers.length })
        : t('bookings.hintPendingOpen'),
    CONFIRMED: helperSharing
      ? t('bookings.hintConfirmedSharing', {
          name: booking.caregiver?.user?.name || t('common.helper'),
        })
      : t('bookings.hintConfirmedNoShare'),
    ACTIVE: helperSharing ? t('bookings.hintActiveSharing') : t('bookings.hintActiveNoShare'),
    REJECTED: t('bookings.hintRejected'),
    CANCELLED: t('bookings.hintCancelled'),
    EXPIRED: t('bookings.hintExpired'),
    COMPLETED: t('bookings.hintCompleted'),
  };

  const slotLabel = formatSessionSlotsLabel(
    booking.sessionSlots,
    booking.sessionStartTime,
    booking.sessionEndTime,
  );
  const visitDate = booking.sessionDate ? formatDate(booking.sessionDate) : null;
  const visitType =
    booking.bookingType === 'SESSION' ? t('common.oneVisit') : t('common.monthly');

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <Text style={styles.back} onPress={() => router.back()}>
        ← {t('common.back')}
      </Text>
      <GlassCard>
        <View style={styles.nameRow}>
          <Text style={styles.name}>
            {booking.caregiver?.user?.name || t('bookings.findingHelper')}
          </Text>
          {booking.caregiver &&
          (booking.caregiver.verificationStatus === 'VERIFIED' || !booking.caregiver.verificationStatus) ? (
            <VerifiedBadge size="md" />
          ) : null}
        </View>
        <StatusPill status={booking.status} />
        <Text style={styles.hint}>{statusHint[booking.status] || ''}</Text>
        <Text style={styles.row}>{t('bookings.typeLabel', { type: visitType })}</Text>
        {booking.requestedSkill ? (
          <Text style={styles.row}>
            {t('bookings.categoryRow', {
              category: localizedSkillLabel(booking.requestedSkill, skills),
            })}
          </Text>
        ) : null}
        {visitDate && slotLabel ? (
          <Text style={styles.row}>
            {t('bookings.timeSlotsRow', { date: visitDate, slots: slotLabel })}
          </Text>
        ) : slotLabel ? (
          <Text style={styles.row}>{t('bookings.timeSlotRow', { slots: slotLabel })}</Text>
        ) : null}
        {formatVisitAddressLines(booking).length > 0 ? (
          <VisitAddressBanner parts={booking} />
        ) : booking.address ? (
          <Text style={styles.row}>
            {t('bookings.addressRow', { address: booking.address })}
          </Text>
        ) : null}
        {booking.totalAmount != null && (
          <Text style={styles.amount}>
            {Stitch.copy.rupee}
            {formatCurrency(booking.totalAmount)}
          </Text>
        )}
      </GlassCard>

      {helperSharing && canTrack ? (
        <View style={styles.onWayBanner}>
          <MaterialIcons name="directions-car" size={22} color={Stitch.colors.success} />
          <View style={styles.onWayTextWrap}>
            <Text style={styles.onWayTitle}>{t('bookings.helperOnWay')}</Text>
            <Text style={styles.onWaySub}>{t('bookings.helperOnWaySub')}</Text>
          </View>
        </View>
      ) : null}

      {canTrack ? (
        <JobTrackingMap
          home={home}
          servant={servant}
          lastUpdated={tracking?.caregiver?.updatedAt ?? null}
          visitAddress={{
            flatNo: booking.flatNo,
            building: booking.building,
            area: booking.area,
            address: booking.address,
          }}
        />
      ) : trackLive && !home ? (
        <GlassCard style={styles.noMap}>
          <Text style={styles.noMapText}>{t('bookings.addAddressForMap')}</Text>
        </GlassCard>
      ) : null}

      {['PENDING', 'CONFIRMED'].includes(booking.status) && (
        <GradientButton
          title={t('bookings.cancelBooking')}
          variant="outline"
          onPress={cancel}
          style={{ marginTop: 20 }}
        />
      )}

      {booking.status === 'COMPLETED' && !booking.review ? (
        <GlassCard style={{ marginTop: 20 }}>
          <Text style={styles.reviewTitle}>{t('bookings.reviewTitle')}</Text>
          <Text style={styles.reviewLabel}>{t('bookings.overallRating')}</Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity key={n} onPress={() => setRating(n)}>
                <MaterialIcons
                  name={n <= rating ? 'star' : 'star-border'}
                  size={32}
                  color={Stitch.colors.secondary}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.reviewLabel}>{t('bookings.elderSafetyRating')}</Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity key={`safety-${n}`} onPress={() => setElderSafetyRating(n)}>
                <MaterialIcons
                  name={n <= elderSafetyRating ? 'verified-user' : 'shield'}
                  size={28}
                  color={Stitch.colors.primary}
                />
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.reviewInput}
            placeholder={t('bookings.reviewPlaceholder')}
            placeholderTextColor={Stitch.colors.onSurfaceVariant + '99'}
            value={reviewComment}
            onChangeText={setReviewComment}
            multiline
          />
          <GradientButton
            title={submittingReview ? t('common.saving') : t('bookings.submitReview')}
            onPress={submitReview}
            loading={submittingReview}
            style={{ marginTop: 12 }}
          />
        </GlassCard>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.background },
  scroll: { padding: Stitch.spacing.padding, paddingTop: 52, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: Stitch.colors.onSurfaceVariant },
  back: { color: Stitch.colors.primary, fontWeight: '600', marginBottom: 16 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  name: { fontSize: 22, fontWeight: '700' },
  hint: { marginTop: 12, color: Stitch.colors.onSurfaceVariant, lineHeight: 20 },
  row: { marginTop: 8, color: Stitch.colors.onBackground },
  helpers: { marginTop: 10, fontSize: 13, color: Stitch.colors.secondary, lineHeight: 18 },
  amount: { marginTop: 12, fontSize: 20, fontWeight: '700', color: Stitch.colors.secondary },
  onWayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    padding: 14,
    borderRadius: Stitch.radius.lg,
    backgroundColor: Stitch.colors.successBg,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.25)',
  },
  onWayTextWrap: { flex: 1 },
  onWayTitle: { fontSize: 15, fontWeight: '700', color: Stitch.colors.success },
  onWaySub: { fontSize: 12, color: Stitch.colors.onSurfaceVariant, marginTop: 2, lineHeight: 16 },
  noMap: { marginTop: 16 },
  noMapText: { color: Stitch.colors.onSurfaceVariant, lineHeight: 20 },
  reviewTitle: { fontSize: 18, fontWeight: '700', color: Stitch.colors.primary, marginBottom: 12 },
  reviewLabel: { fontSize: 14, fontWeight: '600', color: Stitch.colors.onSurfaceVariant, marginTop: 8 },
  starRow: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 4 },
  reviewInput: {
    marginTop: 12,
    minHeight: 80,
    borderRadius: Stitch.radius.md,
    backgroundColor: Stitch.colors.surfaceLow,
    padding: 12,
    fontSize: 15,
    textAlignVertical: 'top',
  },
});
