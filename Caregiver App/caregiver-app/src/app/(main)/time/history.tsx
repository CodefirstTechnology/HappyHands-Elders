import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { Brand } from '@/constants/theme';
import { formatDate, formatTime } from '@/lib/i18n/format';

export default function TimeHistoryScreen() {
  const { t } = useTranslation();
  const { data } = useQuery({
    queryKey: ['time-history'],
    queryFn: async () => {
      const res = await api.get('/time/history');
      return res.data.data.entries;
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('time.historyTitle')}</Text>
      <FlatList
        data={data || []}
        keyExtractor={(item: { id: number }) => String(item.id)}
        renderItem={({ item }: { item: { date: string; hoursWorked?: number; clockIn: string } }) => (
          <View style={styles.card}>
            <Text style={styles.date}>{formatDate(item.date)}</Text>
            <Text>{formatTime(item.clockIn)}</Text>
            <Text style={styles.hours}>{t('time.hoursShort', { hours: item.hoursWorked?.toFixed(1) ?? '—' })}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.background, padding: 20, paddingTop: 56 },
  title: { fontSize: 24, fontWeight: '700', color: Brand.primary, marginBottom: 16 },
  card: { backgroundColor: Brand.surface, borderRadius: 12, padding: 14, marginBottom: 8 },
  date: { fontWeight: '600' },
  hours: { color: Brand.primary, marginTop: 4 },
});
