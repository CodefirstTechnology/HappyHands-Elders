import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import api from '@/lib/api';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';

type Zone = {
  id: number;
  name: string;
  description?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export default function ZonesScreen() {
  const { t } = useTranslation();

  const { data: zones = [], isLoading } = useQuery({
    queryKey: ['my-zones'],
    queryFn: async () => {
      const res = await api.get('/zones/me');
      return res.data.data.zones as Zone[];
    },
  });

  return (
    <View style={styles.root}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <MaterialIcons name="arrow-back" size={28} color={Stitch.colors.primary} />
      </TouchableOpacity>
      <Text style={styles.title}>{t('zones.screenTitle')}</Text>
      <Text style={styles.sub}>{t('zones.screenSubReadOnly')}</Text>

      <FlatList
        data={zones}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {isLoading ? t('common.loading') : t('zones.noZonesAgent')}
          </Text>
        }
        renderItem={({ item }) => (
          <GlassCard style={styles.card}>
            <View style={styles.cardRow}>
              <MaterialIcons name="place" size={22} color={Stitch.colors.secondary} />
              <View style={styles.cardBody}>
                <Text style={styles.zoneName}>{item.name}</Text>
                {item.city ? <Text style={styles.zoneMeta}>{item.city}</Text> : null}
                {item.description ? (
                  <Text style={styles.zoneDesc}>{item.description}</Text>
                ) : null}
              </View>
            </View>
          </GlassCard>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Stitch.colors.background,
    padding: Stitch.spacing.padding,
    paddingTop: 52,
  },
  back: { marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '700', color: Stitch.colors.primary, marginBottom: 8 },
  sub: { color: Stitch.colors.onSurfaceVariant, marginBottom: 16, lineHeight: 20 },
  list: { paddingBottom: 40 },
  card: { marginBottom: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  cardBody: { flex: 1, marginLeft: 10 },
  zoneName: { fontSize: 17, fontWeight: '600' },
  zoneMeta: { fontSize: 13, color: Stitch.colors.secondary, marginTop: 2 },
  zoneDesc: { fontSize: 13, color: Stitch.colors.onSurfaceVariant, marginTop: 4 },
  empty: { textAlign: 'center', color: Stitch.colors.onSurfaceVariant, marginTop: 32 },
});
