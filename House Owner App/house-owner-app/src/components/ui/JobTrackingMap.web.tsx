import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Stitch } from '@/theme/stitch';
import { mapsDeepLink } from '@/lib/locationTypes';
import { VisitAddressBanner } from '@/components/ui/VisitAddressBanner';
import type { VisitAddressParts } from '@/lib/visitAddress';

type Coord = { latitude: number; longitude: number };

type Props = {
  home?: Coord | null;
  caregiver?: Coord | null;
  lastUpdated?: string | null;
  visitAddress?: VisitAddressParts | null;
};

export function JobTrackingMap({ home, servant, lastUpdated, visitAddress }: Props) {
  if (!home) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Live tracking</Text>
      {visitAddress ? <VisitAddressBanner parts={visitAddress} title="Visit address" /> : null}
      <Text style={styles.hint}>
        {servant
          ? `Helper location · ${lastUpdated ? new Date(lastUpdated).toLocaleTimeString('en-IN') : 'updating'}`
          : 'Waiting for helper to share location…'}
      </Text>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => Linking.openURL(mapsDeepLink(home.latitude, home.longitude, 'Your home'))}
      >
        <MaterialIcons name="home" size={18} color={Stitch.colors.primary} />
        <Text style={styles.btnText}>Your home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Stitch.colors.primary, marginBottom: 8 },
  hint: { fontSize: 13, color: Stitch.colors.onSurfaceVariant, marginBottom: 10 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Stitch.colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnText: { color: Stitch.colors.primary, fontWeight: '700', fontSize: 13 },
});
