import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Stitch } from '@/theme/stitch';
import { mapsDeepLink, mapsDirectionsUrl } from '@/lib/locationTypes';

type Coord = { latitude: number; longitude: number };

type Props = {
  home?: Coord | null;
  homeLabel?: string;
  caregiver?: Coord | null;
  showMyLocation?: boolean;
  showMapInitially?: boolean;
  height?: number;
  caption?: string;
};

export function JobTrackingMap({
  home,
  homeLabel = 'Home',
  servant,
  showMapInitially = false,
  caption,
}: Props) {
  if (!home) return null;

  const openDirections = () => {
    const origin = servant || null;
    Linking.openURL(mapsDirectionsUrl(home, origin));
  };

  const openHome = () => Linking.openURL(mapsDeepLink(home.latitude, home.longitude, homeLabel));

  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>
        {caption || 'Map view is on Android/iOS. Use directions below.'}
      </Text>
      {servant ? (
        <Text style={styles.coords}>
          Helper: {servant.latitude.toFixed(5)}, {servant.longitude.toFixed(5)}
        </Text>
      ) : null}
      {showMapInitially ? (
        <Text style={styles.coords}>
          Home: {home.latitude.toFixed(5)}, {home.longitude.toFixed(5)}
        </Text>
      ) : null}
      <View style={styles.row}>
        <TouchableOpacity style={styles.btn} onPress={openDirections}>
          <MaterialIcons name="directions" size={18} color="#fff" />
          <Text style={styles.btnText}>Directions</Text>
        </TouchableOpacity>
        {showMapInitially ? (
          <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={openHome}>
            <MaterialIcons name="place" size={18} color={Stitch.colors.primary} />
            <Text style={[styles.btnText, styles.btnTextOutline]}>View home</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12 },
  hint: { fontSize: 13, color: Stitch.colors.onSurfaceVariant, marginBottom: 8 },
  coords: { fontSize: 12, color: Stitch.colors.onBackground, marginBottom: 4 },
  row: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Stitch.colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Stitch.colors.primary,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnTextOutline: { color: Stitch.colors.primary },
});
