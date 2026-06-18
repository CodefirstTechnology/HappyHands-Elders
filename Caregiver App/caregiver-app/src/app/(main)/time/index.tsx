import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { formatTime } from '@/lib/i18n/format';

export default function TimeScreen() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['time-today'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await api.get('/time/today');
      return res.data.data;
    },
  });

  type Entry = {
    id: number;
    clockIn: string;
    clockOut: string | null;
    hoursWorked?: number;
    booking?: { address?: string };
  };
  const entries = (data?.entries || []) as Entry[];

  return (
    <View style={styles.root}>
      <Text style={styles.title}>{t('time.todayTitle')}</Text>
      <Text style={styles.sub}>
        {t('time.totalHoursLabel', { hours: data?.totalHours?.toFixed(1) ?? '0.0' })}
      </Text>
      <FlatList
        data={entries}
        keyExtractor={(item) => String(item.id)}
        refreshing={isLoading}
        onRefresh={refetch}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <GlassCard>
            <Text style={styles.empty}>{t('time.clockInHint')}</Text>
          </GlassCard>
        }
        renderItem={({ item }) => (
          <GlassCard style={styles.card}>
            <Text style={styles.row}>
              {t('time.clockInAt', { time: formatTime(item.clockIn) })}
            </Text>
            <Text style={styles.row}>
              {item.clockOut
                ? t('time.clockOutAt', { time: formatTime(item.clockOut) })
                : t('time.onDuty')}
            </Text>
            {item.hoursWorked != null && (
              <Text style={styles.hours}>{t('time.hoursShort', { hours: item.hoursWorked })}</Text>
            )}
          </GlassCard>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.background },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Stitch.colors.primary,
    paddingTop: 56,
    paddingHorizontal: Stitch.spacing.padding,
  },
  sub: {
    paddingHorizontal: Stitch.spacing.padding,
    color: Stitch.colors.onSurfaceVariant,
    marginBottom: 12,
  },
  list: { paddingHorizontal: Stitch.spacing.padding, paddingBottom: 100 },
  card: { marginBottom: 12 },
  row: { fontSize: 15, color: Stitch.colors.onBackground },
  hours: { marginTop: 6, fontWeight: '700', color: Stitch.colors.secondary },
  empty: { textAlign: 'center', color: Stitch.colors.onSurfaceVariant },
});
