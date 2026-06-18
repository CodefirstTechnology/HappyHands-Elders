import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatusPill } from '@/components/ui/StatusPill';

type ScheduleBooking = {
  id: number;
  status: string;
  bookingType: string;
  address?: string;
  sessionDate?: string | null;
  parent: { user: { name: string } };
};

const SCHEDULE_STATUSES = new Set(['PENDING', 'CONFIRMED', 'ACTIVE']);

export default function ScheduleScreen() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['bookings'],
    enabled: isAuthenticated,
    staleTime: 5000,
    refetchOnMount: 'always',
    queryFn: async () => {
      const res = await api.get('/bookings');
      return res.data.data.bookings as ScheduleBooking[];
    },
  });

  const scheduleJobs = (data || [])
    .filter((b) => SCHEDULE_STATUSES.has(b.status))
    .sort((a, b) => {
      const aTime = a.sessionDate ? new Date(a.sessionDate).getTime() : 0;
      const bTime = b.sessionDate ? new Date(b.sessionDate).getTime() : 0;
      return aTime - bTime;
    });

  const showLoader = isLoading && scheduleJobs.length === 0;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl
          refreshing={isFetching && !isLoading}
          onRefresh={() => refetch()}
          tintColor={Stitch.colors.primary}
        />
      }
    >
      <Text style={styles.title}>{t('schedule.title')}</Text>
      {showLoader ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Stitch.colors.primary} />
          <Text style={styles.empty}>{t('common.loading')}</Text>
        </View>
      ) : scheduleJobs.length === 0 ? (
        <GlassCard>
          <Text style={styles.empty}>{t('schedule.emptyCalendar')}</Text>
        </GlassCard>
      ) : (
        scheduleJobs.map((b) => (
          <Pressable key={b.id} onPress={() => router.push(`/(main)/schedule/${b.id}`)}>
            <GlassCard style={styles.card}>
              <View style={styles.cardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{b.parent.user.name}</Text>
                  <Text style={styles.meta}>
                    {b.bookingType === 'SESSION' ? t('common.oneVisit') : t('common.monthly')} ·{' '}
                    {b.address || t('schedule.addressTbd')}
                  </Text>
                  <StatusPill status={b.status} />
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={22}
                  color={Stitch.colors.onSurfaceVariant}
                />
              </View>
            </GlassCard>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.background },
  scroll: { padding: Stitch.spacing.padding, paddingTop: 56, paddingBottom: 100 },
  title: { fontSize: 26, fontWeight: '700', color: Stitch.colors.primary, marginBottom: 16 },
  card: { marginBottom: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 17, fontWeight: '600' },
  meta: { color: Stitch.colors.onSurfaceVariant, marginVertical: 6 },
  empty: { textAlign: 'center', color: Stitch.colors.onSurfaceVariant },
  loader: { alignItems: 'center', paddingVertical: 32, gap: 12 },
});
