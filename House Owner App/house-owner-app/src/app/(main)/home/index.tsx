import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Stitch } from '@/theme/stitch';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { useSkills } from '@/hooks/useSkills';
import { localizedSkillLabel } from '@/lib/skills';
import { useNotifications } from '@/hooks/useNotifications';
import { useLiveLocation } from '@/hooks/useLiveLocation';
import {
  BookingSummaryCard,
  splitBookings,
  type BookingSummary,
} from '@/components/bookings/BookingSummaryCard';
import { formatVisitAddressLines } from '@/lib/visitAddress';
import { WorkStartOtpCard } from '@/components/bookings/WorkStartOtpCard';

type BookingWithOtp = BookingSummary & {
  pendingWorkOtp?: boolean;
  workStartOtp?: { code: string; expiresAt: string };
  caregiver?: { user?: { name?: string } };
};

const SKILL_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  CLEANING: 'cleaning-services',
  COOKING: 'restaurant',
  CHILDCARE: 'child-care',
  ELDERLY_CARE: 'elderly',
  LAUNDRY: 'local-laundry-service',
  DRIVING: 'drive-eta',
  GARDENING: 'yard',
};

export default function HomeScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { data: skills = [] } = useSkills();
  const { data: notifications = [] } = useNotifications();
  const { location: liveLocation, loading: locLoading } = useLiveLocation();
  const unreadNotifications = notifications.filter((n) => !n.isRead).length;

  const searchLocation = useMemo(() => {
    if (
      liveLocation?.latitude != null &&
      liveLocation?.longitude != null &&
      !Number.isNaN(liveLocation.latitude) &&
      !Number.isNaN(liveLocation.longitude)
    ) {
      return liveLocation;
    }
    const ho = user?.parent;
    if (ho?.latitude != null && ho?.longitude != null) {
      return { latitude: ho.latitude, longitude: ho.longitude };
    }
    return null;
  }, [liveLocation, user?.parent]);

  const { data: nearbyHelpers = [], isLoading: helpersLoading, refetch: refetchHelpers } = useQuery({
    queryKey: ['caregivers', 'home', searchLocation?.latitude, searchLocation?.longitude],
    enabled: !locLoading && !!searchLocation,
    queryFn: async () => {
      const res = await api.get('/caregivers', {
        params: {
          latitude: searchLocation!.latitude,
          longitude: searchLocation!.longitude,
        },
      });
      return res.data.data.caregivers as unknown[];
    },
  });

  const nearbyCount = nearbyHelpers.length;

  const openRequest = (skillCode?: string) => {
    router.push({
      pathname: '/(main)/bookings/request',
      params: skillCode ? { skill: skillCode } : undefined,
    });
  };

  const { data: bookings, refetch: refetchBookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const res = await api.get('/bookings');
      return res.data.data.bookings as BookingSummary[];
    },
    refetchInterval: 10000,
  });

  const bookingList = (bookings || []) as BookingWithOtp[];
  const otpBooking = bookingList.find((b) => b.workStartOtp?.code);
  const { active, recent } = splitBookings(bookingList);
  const homeActive = active.slice(0, 2);
  const homeRecent = recent.slice(0, 2);
  const hasBookings = homeActive.length > 0 || homeRecent.length > 0;

  const headerLocation = (() => {
    const ho = user?.parent;
    const detailLines = ho
      ? formatVisitAddressLines({
          flatNo: ho.flatNo,
          building: ho.building,
          area: ho.area,
          address: liveLocation?.address || ho.address,
        })
      : [];
    if (detailLines.length > 0) return detailLines.slice(0, 2).join(' · ');
    return (
      liveLocation?.address ||
      (ho?.address ? ho.address.split(',').slice(0, 2).join(',').trim() : null) ||
      ho?.city ||
      t('common.tapSetHome')
    );
  })();

  return (
    <View style={styles.root}>
      <ScreenHeader
        location={headerLocation}
        unreadNotifications={unreadNotifications}
        onNotifications={() => router.push('/(main)/notifications')}
        onLocationPress={() => router.push('/(main)/profile')}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={helpersLoading || bookingsLoading}
            onRefresh={() => {
              refetchHelpers();
              refetchBookings();
            }}
            tintColor={Stitch.colors.primary}
          />
        }
      >
        <TouchableOpacity
          style={styles.searchWrap}
          activeOpacity={0.85}
          onPress={() => openRequest()}
        >
          <MaterialIcons name="search" size={22} color={Stitch.colors.onSurfaceVariant} />
          <Text style={styles.searchPlaceholder}>{t('home.searchPlaceholder')}</Text>
        </TouchableOpacity>

        <LinearGradient
          colors={[Stitch.colors.secondary, Stitch.colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>{t('home.fastBooking')}</Text>
          </View>
          <Text style={styles.heroTitle}>{t('home.requestInArea')}</Text>
          <Text style={styles.heroSub}>
            {searchLocation
              ? nearbyCount > 0
                ? t('home.helpersNearby', { count: nearbyCount })
                : t('home.noHelpersNearby')
              : t('home.enableLocation')}
          </Text>
          <TouchableOpacity
            style={[styles.heroBtn, !searchLocation && styles.heroBtnDisabled]}
            disabled={!searchLocation}
            onPress={() => openRequest()}
          >
            <Text style={styles.heroBtnText}>{t('home.sendRequestNow')}</Text>
          </TouchableOpacity>
        </LinearGradient>

        {searchLocation ? (
          <GlassCard style={styles.countCard}>
            <View style={styles.countRow}>
              <View style={styles.countIcon}>
                <MaterialIcons name="groups" size={28} color={Stitch.colors.secondary} />
              </View>
              <View style={styles.countBody}>
                <Text style={styles.countValue}>
                  {helpersLoading ? '…' : nearbyCount}
                </Text>
                <Text style={styles.countLabel}>
                  {t('home.verifiedNearYou', { count: nearbyCount })}
                </Text>
              </View>
            </View>
          </GlassCard>
        ) : null}

        <Text style={[styles.sectionTitle, styles.sectionTitleSpacing]}>{t('home.whatNeed')}</Text>
        <View style={styles.grid}>
          {skills.map((c) => (
            <TouchableOpacity
              key={c.code}
              style={styles.cat}
              onPress={() => openRequest(c.code)}
            >
              <View style={styles.catIcon}>
                <MaterialIcons
                  name={SKILL_ICONS[c.code] || 'handyman'}
                  size={28}
                  color={Stitch.colors.primary}
                />
              </View>
              <Text style={styles.catLabel}>{localizedSkillLabel(c.code, skills)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {otpBooking?.workStartOtp?.code ? (
          <WorkStartOtpCard
            code={otpBooking.workStartOtp.code}
            helperName={otpBooking.caregiver?.user?.name}
          />
        ) : null}

        <View style={styles.bookingsHeader}>
          <Text style={styles.sectionTitle}>{t('home.yourBookings')}</Text>
          {hasBookings ? (
            <TouchableOpacity onPress={() => router.push('/(main)/bookings')} hitSlop={8}>
              <Text style={styles.seeAll}>{t('common.seeAll')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {!hasBookings ? (
          <GlassCard>
            <Text style={styles.empty}>{t('home.noBookingsYet')}</Text>
          </GlassCard>
        ) : (
          <>
            {homeActive.length > 0 ? (
              <>
                <Text style={styles.bookingsSub}>{t('common.active')}</Text>
                {homeActive.map((b) => (
                  <BookingSummaryCard
                    key={b.id}
                    booking={b}
                    skills={skills}
                    onPress={() => router.push(`/(main)/bookings/${b.id}`)}
                  />
                ))}
              </>
            ) : null}
            {homeRecent.length > 0 ? (
              <>
                <Text style={[styles.bookingsSub, homeActive.length > 0 && styles.bookingsSubGap]}>
                  {t('common.recent')}
                </Text>
                {homeRecent.map((b) => (
                  <BookingSummaryCard
                    key={b.id}
                    booking={b}
                    skills={skills}
                    onPress={() => router.push(`/(main)/bookings/${b.id}`)}
                  />
                ))}
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.background },
  scroll: { paddingHorizontal: Stitch.spacing.padding, paddingBottom: 100 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Stitch.colors.surfaceLow,
    borderRadius: Stitch.radius.lg,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 20,
  },
  searchPlaceholder: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: Stitch.colors.onSurfaceVariant + '99',
  },
  hero: {
    borderRadius: Stitch.radius.xl,
    padding: 24,
    marginBottom: 28,
    shadowColor: Stitch.colors.secondary,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Stitch.radius.pill,
    marginBottom: 10,
  },
  heroBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  heroTitle: { fontSize: 26, fontWeight: '700', color: '#fff', marginBottom: 6 },
  heroSub: { color: 'rgba(255,255,255,0.9)', fontSize: 15, marginBottom: 16 },
  heroBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Stitch.radius.lg,
  },
  heroBtnText: { color: Stitch.colors.secondary, fontWeight: '700' },
  heroBtnDisabled: { opacity: 0.6 },
  countCard: { marginBottom: 24 },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  countIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Stitch.colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBody: { flex: 1 },
  countValue: { fontSize: 32, fontWeight: '700', color: Stitch.colors.primary },
  countLabel: { fontSize: 14, color: Stitch.colors.onSurfaceVariant, marginTop: 2 },
  countHint: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 18,
    color: Stitch.colors.onSurfaceVariant,
  },
  sectionTitle: {
    ...Stitch.typography.headline,
    fontSize: 20,
    color: Stitch.colors.onBackground,
    marginBottom: 0,
  },
  sectionTitleSpacing: { marginBottom: 16 },
  bookingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 4,
  },
  seeAll: { fontSize: 14, fontWeight: '600', color: Stitch.colors.secondary },
  bookingsSub: {
    fontSize: 13,
    fontWeight: '700',
    color: Stitch.colors.onSurfaceVariant,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bookingsSubGap: { marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  cat: { width: '30%', alignItems: 'center', marginBottom: 8 },
  catIcon: {
    width: 64,
    height: 64,
    borderRadius: Stitch.radius.lg,
    backgroundColor: Stitch.colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: Stitch.colors.primaryContainer,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  catLabel: {
    ...Stitch.typography.caption,
    color: Stitch.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  empty: { color: Stitch.colors.onSurfaceVariant, textAlign: 'center' },
});
