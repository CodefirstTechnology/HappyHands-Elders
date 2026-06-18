import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router, useFocusEffect } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatusPill } from '@/components/ui/StatusPill';
import { GradientButton } from '@/components/ui/GradientButton';
import { LocationMapPreview } from '@/components/ui/LocationMapPreview';
import { JobTrackingMap } from '@/components/ui/JobTrackingMap';
import { formatVisitAddressLines } from '@/lib/visitAddress';
import { useServantLocationReporter } from '@/hooks/useServantLocationReporter';
import { useNotifications } from '@/hooks/useNotifications';
import { formatSessionSlotsLabel } from '@/lib/timeSlots';
import { computeTodayEarnings, computeMonthlyEarnings } from '@/lib/earnings';
import { localizedSkillLabel } from '@/lib/skills';
import { formatDate, formatCurrency } from '@/lib/i18n/format';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { WorkStartOtpPanel } from '@/components/bookings/WorkStartOtpPanel';
import {
  stopPendingRequestVibration,
  syncPendingRequestVibration,
  vibrateBookingAccepted,
} from '@/lib/bookingRequestVibration';

type Booking = {
  id: number;
  status: string;
  bookingType: string;
  address?: string;
  flatNo?: string | null;
  building?: string | null;
  area?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  requestedSkill?: string | null;
  sessionStartTime?: string | null;
  sessionEndTime?: string | null;
  sessionSlots?: string | null;
  sessionDate?: string | null;
  sessionHours?: number | null;
  monthlyStartDate?: string | null;
  totalAmount?: number | null;
  updatedAt?: string;
  parent: { user: { name: string } };
  pendingWorkOtp?: boolean;
  workOtpExpiresAt?: string | null;
};

export default function ServantHomeScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const qc = useQueryClient();
  const [elapsed, setElapsed] = useState(0);
  const [activeBookingId, setActiveBookingId] = useState<number | null>(null);
  const [activeEntry, setActiveEntry] = useState<{ clockIn: string; bookingId?: number } | null>(
    null,
  );
  const [actingId, setActingId] = useState<number | null>(null);
  const [onWayBookingId, setOnWayBookingId] = useState<number | null>(null);

  const trackingBookingId = activeBookingId ?? onWayBookingId;
  useServantLocationReporter(trackingBookingId, trackingBookingId != null);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) return;
      void refreshUser();
      void qc.invalidateQueries({ queryKey: ['caregiver-profile'] });
    }, [isAuthenticated, qc, refreshUser]),
  );

  const refreshBookings = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['bookings'] }),
      qc.invalidateQueries({ queryKey: ['open-requests'] }),
      qc.invalidateQueries({ queryKey: ['notifications'] }),
      qc.invalidateQueries({ queryKey: ['schedule'] }),
    ]);

  const {
    data: bookings,
    refetch: refetchBookings,
    isLoading: bookingsLoading,
    isError: bookingsError,
  } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const res = await api.get('/bookings');
      return res.data.data.bookings as Booking[];
    },
    enabled: isAuthenticated,
    staleTime: 5000,
    refetchInterval: isAuthenticated ? 12000 : false,
    refetchOnMount: 'always',
  });

  const { data: profile } = useQuery({
    queryKey: ['caregiver-profile'],
    queryFn: async () => {
      const res = await api.get('/caregivers/me');
      return res.data.data.caregiver as {
        hourlyRate?: number | null;
        verificationStatus?: string;
      };
    },
    enabled: isAuthenticated,
  });

  const isVerified =
    profile?.verificationStatus === 'VERIFIED' ||
    user?.caregiver?.verificationStatus === 'VERIFIED';

  const { data: openRequests } = useQuery({
    queryKey: ['open-requests'],
    queryFn: async () => {
      const res = await api.get('/bookings/open-requests');
      return res.data.data.requests as Booking[];
    },
    enabled: isAuthenticated,
    refetchInterval: isAuthenticated ? 12000 : false,
  });

  const { data: notifications } = useNotifications();

  const { data: today, refetch: refetchToday } = useQuery({
    queryKey: ['time-today'],
    queryFn: async () => {
      const res = await api.get('/time/today');
      return res.data.data as {
        totalHours?: number;
        estimatedEarnings?: number;
        hourlyRate?: number;
        entries?: { clockOut: string | null; clockIn: string; bookingId?: number }[];
      };
    },
    enabled: isAuthenticated,
    refetchInterval: isAuthenticated ? 20000 : false,
  });

  const { data: monthStats } = useQuery({
    queryKey: ['time-month'],
    queryFn: async () => {
      const res = await api.get('/time/month');
      return res.data.data as {
        totalEarnings?: number;
        completedCount?: number;
        monthLabel?: string;
      };
    },
    enabled: isAuthenticated,
    refetchInterval: isAuthenticated ? 20000 : false,
  });

  useEffect(() => {
    const open = today?.entries?.find((e) => !e.clockOut);
    if (open) {
      setActiveEntry({ clockIn: open.clockIn, bookingId: open.bookingId });
      setActiveBookingId(open.bookingId ?? null);
    } else {
      setActiveEntry(null);
      setActiveBookingId(null);
    }
  }, [today]);

  useEffect(() => {
    if (!activeEntry) return;
    const t = setInterval(() => {
      setElapsed((Date.now() - new Date(activeEntry.clockIn).getTime()) / 1000);
    }, 1000);
    return () => clearInterval(t);
  }, [activeEntry]);

  const pending = (bookings || []).filter((b) => b.status === 'PENDING');
  const todayJobs = (bookings || []).filter((b) => ['CONFIRMED', 'ACTIVE'].includes(b.status));

  const formatElapsed = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const apiError = (e: unknown, fallback: string) => {
    const err = e as { response?: { data?: { message?: string } } };
    return err.response?.data?.message || fallback;
  };

  const markArrived = async (bookingId: number) => {
    try {
      await api.patch(`/bookings/${bookingId}/arrived`);
      setOnWayBookingId(null);
      await refreshBookings();
      Alert.alert(t('workOtp.requestedTitle'), t('workOtp.requestedBody'));
    } catch (e: unknown) {
      Alert.alert(t('servantHome.couldNotStart'), apiError(e, t('servantHome.checkConfirmed')));
    }
  };

  const onWorkOtpVerified = async (bookingId: number) => {
    setActiveBookingId(bookingId);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['time-today'] }),
      qc.invalidateQueries({ queryKey: ['time-month'] }),
      qc.invalidateQueries({ queryKey: ['bookings'] }),
    ]);
  };

  const clockOut = async () => {
    try {
      await api.post('/time/clock-out');
      setActiveEntry(null);
      setActiveBookingId(null);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['time-today'] }),
        qc.invalidateQueries({ queryKey: ['time-month'] }),
        qc.invalidateQueries({ queryKey: ['bookings'] }),
      ]);
      Alert.alert(t('servantHome.clockedOutTitle'), t('servantHome.hoursSaved'));
    } catch (e: unknown) {
      Alert.alert(t('errors.generic'), apiError(e, t('servantHome.couldNotClockOut')));
    }
  };

  const resumePendingVibrationIfNeeded = () => {
    const open = qc.getQueryData(['open-requests']) as Booking[] | undefined;
    const all = qc.getQueryData(['bookings']) as Booking[] | undefined;
    const stillPending =
      (open?.length ?? 0) + (all?.filter((b) => b.status === 'PENDING').length ?? 0) > 0;
    syncPendingRequestVibration(stillPending);
  };

  const confirm = async (id: number) => {
    if (actingId != null) return;
    setActingId(id);
    stopPendingRequestVibration();
    try {
      await api.patch(`/bookings/${id}/confirm`);
      await refreshBookings();
      await vibrateBookingAccepted();
      Alert.alert(t('servantHome.acceptedTitle'), t('servantHome.customerNotified'));
    } catch (e: unknown) {
      const message = apiError(e, 'Try again');
      if (message.toLowerCase().includes('not pending')) {
        await refreshBookings();
        Alert.alert(t('servantHome.alreadyHandled'), t('servantHome.requestHandled'));
      } else {
        Alert.alert(t('servantHome.couldNotAccept'), message);
        resumePendingVibrationIfNeeded();
      }
    } finally {
      setActingId(null);
    }
  };

  const reject = async (id: number) => {
    if (actingId != null) return;
    setActingId(id);
    try {
      await api.patch(`/bookings/${id}/reject`, { reason: t('servantHome.rejectReason') });
      await refreshBookings();
      Alert.alert(t('servantHome.declinedTitle'), t('servantHome.customerNotified'));
    } catch (e: unknown) {
      const message = apiError(e, 'Try again');
      if (message.toLowerCase().includes('not pending')) {
        await refreshBookings();
        Alert.alert(t('servantHome.alreadyHandled'), t('servantHome.requestHandled'));
      } else {
        Alert.alert(t('servantHome.couldNotDecline'), message);
      }
    } finally {
      setActingId(null);
    }
  };

  const unread = (notifications || []).filter((n) => !n.isRead).length;

  const openJobDetail = (bookingId: number) => {
    router.push(`/(main)/schedule/${bookingId}`);
  };

  const hourlyRate = profile?.hourlyRate ?? today?.hourlyRate ?? 0;
  const todayStats = computeTodayEarnings(bookings || [], hourlyRate, today);
  const monthlyFromBookings = computeMonthlyEarnings(bookings || [], hourlyRate);
  const monthlyAmount = Math.max(monthStats?.totalEarnings ?? 0, monthlyFromBookings.amount);
  const monthlyCount = Math.max(
    monthStats?.completedCount ?? 0,
    monthlyFromBookings.completedCount,
  );
  const monthLabel = monthStats?.monthLabel ?? monthlyFromBookings.monthLabel;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <View style={styles.topBar}>
        <View style={styles.proRow}>
          <View style={styles.proAvatar}>
            <Text style={styles.proAvatarText}>{user?.name?.[0]}</Text>
          </View>
          <View style={styles.proText}>
            <Text style={styles.proBrand}>{t('common.appNamePro')}</Text>
            <View style={styles.nameRow}>
              <Text style={styles.proName}>
                {t('servantHome.namaste', { name: user?.name?.split(' ')[0] || '' })}
              </Text>
              {isVerified ? <VerifiedBadge /> : null}
            </View>
          </View>
        </View>
        <View style={styles.online}>
          <View style={styles.dot} />
          <Text style={styles.onlineText}>{t('servantHome.online')}</Text>
          <NotificationBell
            unread={unread}
            onPress={() => router.push('/(main)/notifications')}
          />
        </View>
      </View>

      <View style={styles.earnRow}>
        <View>
          <Text style={styles.earnLabel}>{t('servantHome.todayEarningsLabel')}</Text>
          <Text style={styles.earnValue}>
            {Stitch.copy.rupee}
            {formatCurrency(todayStats.amount)}
          </Text>
          <Text style={styles.earnSub}>
            {todayStats.completedCount > 0
              ? t('servantHome.jobsCompletedToday', { count: todayStats.completedCount })
              : todayStats.hoursToday > 0
                ? t('servantHome.hoursLoggedToday', { hours: todayStats.hoursToday.toFixed(1) })
                : t('servantHome.earningsUpdateHint')}
          </Text>
        </View>
        <View style={styles.jobsBadge}>
          <Text style={styles.jobsNum}>{todayJobs.length}</Text>
          <Text style={styles.jobsLbl}>{t('servantHome.jobsLabel')}</Text>
        </View>
      </View>

      <GlassCard style={styles.monthCard}>
        <View style={styles.monthRow}>
          <View style={styles.monthIconWrap}>
            <MaterialIcons name="calendar-month" size={22} color={Stitch.colors.secondary} />
          </View>
          <View style={styles.monthBody}>
            <Text style={styles.monthLabel}>
              {t('servantHome.monthCardLabel', { month: monthLabel.toUpperCase() })}
            </Text>
            <Text style={styles.monthValue}>
              {Stitch.copy.rupee}
              {formatCurrency(monthlyAmount)}
            </Text>
            <Text style={styles.monthSub}>
              {monthlyCount > 0
                ? t('servantHome.monthJobsSub', { count: monthlyCount })
                : t('servantHome.monthEmptySub')}
            </Text>
          </View>
          <Pressable onPress={() => router.push('/(main)/earnings')} hitSlop={8}>
            <MaterialIcons name="chevron-right" size={24} color={Stitch.colors.onSurfaceVariant} />
          </Pressable>
        </View>
      </GlassCard>

      {activeEntry ? (
        <>
          <Pressable onPress={() => activeBookingId && openJobDetail(activeBookingId)}>
            <LinearGradient colors={[Stitch.colors.error, '#c62828']} style={styles.clockCard}>
              <Text style={styles.clockLabel}>{t('servantHome.workInProgress')}</Text>
              <Text style={styles.clockTime}>{formatElapsed(elapsed)}</Text>
              <Text style={styles.viewDetail}>{t('servantHome.tapJobDetails')}</Text>
              <TouchableOpacity style={styles.clockBtn} onPress={clockOut}>
                <Text style={styles.clockBtnText}>{t('servantHome.endWorkClockOut')}</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Pressable>
          {(() => {
            const activeJob = todayJobs.find((b) => b.id === activeBookingId);
            const home =
              activeJob?.latitude != null && activeJob?.longitude != null
                ? { latitude: activeJob.latitude, longitude: activeJob.longitude }
                : null;
            return (
              <View style={styles.liveMap}>
                <JobTrackingMap
                  home={home}
                  homeLabel={activeJob?.parent.user.name || t('schedule.customer')}
                  showMyLocation
                  showMapInitially
                  height={220}
                  visitAddress={
                    activeJob
                      ? {
                          flatNo: activeJob.flatNo,
                          building: activeJob.building,
                          area: activeJob.area,
                          address: activeJob.address,
                        }
                      : null
                  }
                  caption={t('servantHome.sharingLocation')}
                />
              </View>
            );
          })()}
        </>
      ) : null}

      {openRequests && openRequests.length > 0 && (
        <>
          <Text style={styles.section}>{t('servantHome.openRequestsTitle')}</Text>
          <Text style={styles.sectionSub}>{t('servantHome.openRequestsSub')}</Text>
          {openRequests.map((b) => {
            const slotLabel = formatSessionSlotsLabel(
              b.sessionSlots,
              b.sessionStartTime,
              b.sessionEndTime,
            );
            const visitDate = b.sessionDate ? formatDate(b.sessionDate) : null;
            return (
            <GlassCard key={`open-${b.id}`} style={styles.mb}>
              <Pressable onPress={() => openJobDetail(b.id)} style={styles.jobHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{b.parent.user.name}</Text>
                  <Text style={styles.cardMeta}>
                    {localizedSkillLabel(b.requestedSkill || '', []) || t('servantHome.generalHelp')}
                    {' · '}
                    {b.bookingType === 'SESSION' ? t('common.oneVisit') : t('common.monthly')}
                  </Text>
                  {visitDate && slotLabel ? (
                    <Text style={styles.slotText}>
                      {visitDate} · {slotLabel}
                    </Text>
                  ) : slotLabel ? (
                    <Text style={styles.slotText}>{slotLabel}</Text>
                  ) : null}
                  {b.address ? <Text style={styles.addr}>{b.address}</Text> : null}
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={22}
                  color={Stitch.colors.onSurfaceVariant}
                />
              </Pressable>
              <LocationMapPreview
                latitude={b.latitude}
                longitude={b.longitude}
                address={b.address}
                height={140}
              />
              <TouchableOpacity
                style={[styles.accept, actingId === b.id && styles.btnDisabled]}
                onPress={() => confirm(b.id)}
                disabled={actingId != null}
              >
                <Text style={styles.acceptText}>
                  {actingId === b.id ? t('servantHome.accepting') : t('servantHome.acceptJobFirstWins')}
                </Text>
              </TouchableOpacity>
            </GlassCard>
            );
          })}
        </>
      )}

      {pending.length > 0 && (
        <>
          <Text style={styles.section}>{t('servantHome.newRequestsSection')}</Text>
          {pending.map((b) => (
            <GlassCard key={b.id} style={styles.mb}>
              <Pressable onPress={() => openJobDetail(b.id)} style={styles.jobHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{b.parent.user.name}</Text>
                  <Text style={styles.cardMeta}>{b.bookingType}</Text>
                  {b.address ? <Text style={styles.addr}>{b.address}</Text> : null}
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={22}
                  color={Stitch.colors.onSurfaceVariant}
                />
              </Pressable>
              <LocationMapPreview
                latitude={b.latitude}
                longitude={b.longitude}
                address={b.address}
                height={140}
              />
              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.accept, actingId === b.id && styles.btnDisabled]}
                  onPress={() => confirm(b.id)}
                  disabled={actingId != null}
                >
                  <Text style={styles.acceptText}>
                    {actingId === b.id ? t('servantHome.pleaseWait') : t('schedule.accept')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.reject, actingId === b.id && styles.btnDisabled]}
                  onPress={() => reject(b.id)}
                  disabled={actingId != null}
                >
                  <Text style={styles.rejectText}>{t('servantHome.decline')}</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          ))}
        </>
      )}

      <Text style={styles.section}>{t('caregiverHome.todaySchedule')}</Text>
      {bookingsLoading && !bookings ? (
        <GlassCard>
          <Text style={styles.empty}>{t('common.loading')}</Text>
        </GlassCard>
      ) : bookingsError ? (
        <GlassCard>
          <Text style={styles.empty}>{t('servantHome.bookingsLoadFailed')}</Text>
          <TouchableOpacity onPress={() => refetchBookings()} style={{ marginTop: 8 }}>
            <Text style={styles.retry}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </GlassCard>
      ) : todayJobs.length === 0 ? (
        <GlassCard>
          <Text style={styles.empty}>{t('servantHome.noConfirmedJobs')}</Text>
        </GlassCard>
      ) : (
        todayJobs.map((b) => {
          const isActive = b.status === 'ACTIVE' || activeBookingId === b.id;
          return (
            <GlassCard key={b.id} style={styles.mb}>
              <Pressable onPress={() => openJobDetail(b.id)} style={styles.jobHeader}>
                <View style={styles.jobRow}>
                  <MaterialIcons name="location-on" size={18} color={Stitch.colors.secondary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{b.parent.user.name}</Text>
                    <Text style={styles.cardMeta}>
                      {formatVisitAddressLines(b).join(' · ') || b.address || t('servantHome.addressOnFile')}
                    </Text>
                  </View>
                  <MaterialIcons
                    name="chevron-right"
                    size={22}
                    color={Stitch.colors.onSurfaceVariant}
                  />
                </View>
              </Pressable>
              <StatusPill status={b.status} />
              {b.latitude != null && b.longitude != null ? (
                <JobTrackingMap
                  home={{ latitude: b.latitude, longitude: b.longitude }}
                  homeLabel={b.parent.user.name}
                  showMyLocation={!activeEntry}
                  showMapInitially={onWayBookingId === b.id}
                  height={160}
                  visitAddress={{
                    flatNo: b.flatNo,
                    building: b.building,
                    area: b.area,
                    address: b.address,
                  }}
                  caption={
                    onWayBookingId === b.id
                      ? t('servantHome.locationShared')
                      : t('servantHome.tapDirections')
                  }
                />
              ) : (
                <LocationMapPreview
                  latitude={b.latitude}
                  longitude={b.longitude}
                  address={b.address}
                  height={140}
                />
              )}
              {!activeEntry && b.status === 'CONFIRMED' && (
                <>
                  <TouchableOpacity
                    style={styles.onWayBtn}
                    onPress={() =>
                      setOnWayBookingId((prev) => (prev === b.id ? null : b.id))
                    }
                  >
                    <Text style={styles.onWayText}>
                      {onWayBookingId === b.id
                        ? t('servantHome.stopSharingLocation')
                        : t('servantHome.onMyWayShare')}
                    </Text>
                  </TouchableOpacity>
                  {b.pendingWorkOtp ? (
                    <WorkStartOtpPanel
                      bookingId={b.id}
                      expiresAt={b.workOtpExpiresAt}
                      onVerified={() => onWorkOtpVerified(b.id)}
                      onResend={() => refreshBookings()}
                    />
                  ) : (
                    <GradientButton
                      title={t('workOtp.requestOtp')}
                      onPress={() => markArrived(b.id)}
                      style={{ marginTop: 12 }}
                    />
                  )}
                </>
              )}
              {isActive && activeEntry && (
                <Text style={styles.onDuty}>{t('servantHome.clockedInAtHome')}</Text>
              )}
            </GlassCard>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.background },
  scroll: { paddingBottom: 100 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 52,
    paddingHorizontal: Stitch.spacing.padding,
    paddingBottom: 16,
    backgroundColor: 'rgba(252,248,255,0.9)',
  },
  proRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
    marginRight: 8,
  },
  proText: { flex: 1, minWidth: 0 },
  proAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Stitch.colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proAvatarText: { fontSize: 20, fontWeight: '700', color: Stitch.colors.primary },
  proBrand: { fontSize: 12, fontWeight: '700', color: Stitch.colors.primary },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 2 },
  proName: { fontSize: 16, fontWeight: '600' },
  online: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  onlineText: { fontSize: 11, fontWeight: '700', color: Stitch.colors.primary, letterSpacing: 1 },
  earnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: Stitch.spacing.padding,
    marginBottom: 20,
  },
  earnLabel: { fontSize: 12, fontWeight: '600', color: Stitch.colors.onSurfaceVariant },
  earnValue: { fontSize: 36, fontWeight: '700', color: Stitch.colors.primary, marginTop: 4 },
  earnSub: {
    fontSize: 12,
    color: Stitch.colors.onSurfaceVariant,
    marginTop: 4,
    maxWidth: 220,
    lineHeight: 16,
  },
  jobsBadge: {
    backgroundColor: 'rgba(214, 151, 254, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: 'center',
  },
  jobsNum: { fontSize: 22, fontWeight: '700', color: Stitch.colors.secondary },
  jobsLbl: { fontSize: 10, fontWeight: '700', color: Stitch.colors.secondary },
  monthCard: { marginHorizontal: Stitch.spacing.padding, marginBottom: 20 },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  monthIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(214, 151, 254, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthBody: { flex: 1 },
  monthLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Stitch.colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  monthValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Stitch.colors.secondary,
    marginTop: 4,
  },
  monthSub: {
    fontSize: 12,
    color: Stitch.colors.onSurfaceVariant,
    marginTop: 4,
    lineHeight: 16,
  },
  clockCard: { marginHorizontal: 24, borderRadius: 24, padding: 24, marginBottom: 12 },
  liveMap: { marginHorizontal: 24, marginBottom: 20 },
  clockLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 14 },
  clockTime: { color: '#fff', fontSize: 32, fontWeight: '700', marginVertical: 12 },
  viewDetail: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginBottom: 12 },
  clockBtn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  clockBtnText: { color: Stitch.colors.error, fontWeight: '700' },
  section: {
    fontSize: 18,
    fontWeight: '700',
    color: Stitch.colors.primary,
    marginHorizontal: 24,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionSub: {
    fontSize: 13,
    color: Stitch.colors.onSurfaceVariant,
    marginHorizontal: 24,
    marginBottom: 12,
    marginTop: -6,
    lineHeight: 18,
  },
  mb: { marginHorizontal: 24, marginBottom: 12 },
  cardTitle: { fontSize: 17, fontWeight: '600' },
  cardMeta: { color: Stitch.colors.onSurfaceVariant, marginTop: 4, marginBottom: 4 },
  slotText: { fontSize: 13, color: Stitch.colors.primary, fontWeight: '600', marginBottom: 4 },
  addr: { fontSize: 13, color: Stitch.colors.secondary, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 10 },
  accept: {
    flex: 1,
    backgroundColor: Stitch.colors.primary,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  acceptText: { color: '#fff', fontWeight: '600' },
  reject: {
    flex: 1,
    borderWidth: 2,
    borderColor: Stitch.colors.error,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  rejectText: { color: Stitch.colors.error, fontWeight: '600' },
  btnDisabled: { opacity: 0.55 },
  onWayBtn: {
    marginTop: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Stitch.colors.secondary,
  },
  onWayText: { color: Stitch.colors.secondary, fontWeight: '600', fontSize: 13 },
  jobRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  empty: { textAlign: 'center', color: Stitch.colors.onSurfaceVariant },
  retry: { textAlign: 'center', color: Stitch.colors.primary, fontWeight: '600' },
  onDuty: { marginTop: 10, color: Stitch.colors.success, fontWeight: '600' },
});
