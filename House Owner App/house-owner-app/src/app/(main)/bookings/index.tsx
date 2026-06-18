import { View, Text, StyleSheet, FlatList } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import api from '@/lib/api';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientButton } from '@/components/ui/GradientButton';
import { useSkills } from '@/hooks/useSkills';
import {
  BookingSummaryCard,
  splitBookings,
  type BookingSummary,
} from '@/components/bookings/BookingSummaryCard';

export default function BookingsListScreen() {
  const { t } = useTranslation();
  const { data: skills = [] } = useSkills();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const res = await api.get('/bookings');
      return res.data.data.bookings as BookingSummary[];
    },
    refetchInterval: 20000,
  });

  const bookings = data || [];
  const { active, recent } = splitBookings(bookings);

  const renderSection = (title: string, items: BookingSummary[], emptyText: string) => (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCount}>{items.length}</Text>
      </View>
      {items.length === 0 ? (
        <GlassCard>
          <Text style={styles.sectionEmpty}>{emptyText}</Text>
        </GlassCard>
      ) : (
        items.map((item) => (
          <BookingSummaryCard
            key={item.id}
            booking={item}
            skills={skills}
            onPress={() => router.push(`/(main)/bookings/${item.id}`)}
          />
        ))
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('bookings.myBookings')}</Text>
        <Text style={styles.sub}>{t('bookings.activeAndRecent')}</Text>
      </View>

      <FlatList
        data={[{ key: 'content' }]}
        keyExtractor={(item) => item.key}
        refreshing={isLoading}
        onRefresh={refetch}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          bookings.length === 0 && !isLoading ? (
            <GlassCard style={styles.emptyCard}>
              <MaterialIcons name="event-busy" size={40} color={Stitch.colors.onSurfaceVariant} />
              <Text style={styles.emptyTitle}>{t('bookings.noBookingsTitle')}</Text>
              <Text style={styles.emptySub}>{t('bookings.noBookingsSub')}</Text>
              <GradientButton
                title={t('bookings.sendRequest')}
                onPress={() => router.push('/(main)/bookings/request')}
                style={styles.emptyBtn}
              />
            </GlassCard>
          ) : null
        }
        renderItem={() => (
          <>
            {renderSection(t('common.active'), active, t('bookings.noActive'))}
            {renderSection(t('common.recent'), recent, t('bookings.noRecent'))}
          </>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.background },
  header: {
    paddingTop: 56,
    paddingHorizontal: Stitch.spacing.padding,
    paddingBottom: 8,
  },
  title: { fontSize: 28, fontWeight: '700', color: Stitch.colors.primary },
  sub: { fontSize: 14, color: Stitch.colors.onSurfaceVariant, marginTop: 4 },
  list: { paddingHorizontal: Stitch.spacing.padding, paddingBottom: 100 },
  section: { marginBottom: 24 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Stitch.colors.onBackground },
  sectionCount: {
    fontSize: 13,
    fontWeight: '700',
    color: Stitch.colors.secondary,
    backgroundColor: Stitch.colors.primaryFixed,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Stitch.radius.pill,
  },
  sectionEmpty: { textAlign: 'center', color: Stitch.colors.onSurfaceVariant, lineHeight: 20 },
  emptyCard: { alignItems: 'center', marginBottom: 24, paddingVertical: 28 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Stitch.colors.onBackground,
    marginTop: 12,
  },
  emptySub: {
    textAlign: 'center',
    color: Stitch.colors.onSurfaceVariant,
    marginTop: 8,
    lineHeight: 20,
    marginBottom: 16,
  },
  emptyBtn: { alignSelf: 'stretch' },
});
