import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Stitch } from '@/theme/stitch';
import { mapsDeepLink } from '@/lib/locationTypes';

type Props = {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  height?: number;
};

export function LocationMapPreview({
  latitude,
  longitude,
  address,
}: Props) {
  if (latitude == null || longitude == null) {
    return null;
  }

  const openMaps = () => {
    Linking.openURL(mapsDeepLink(latitude, longitude, address || undefined));
  };

  return (
    <View style={styles.wrap}>
      {address ? <Text style={styles.address}>{address}</Text> : null}
      <TouchableOpacity style={styles.linkBtn} onPress={openMaps}>
        <MaterialIcons name="map" size={18} color={Stitch.colors.primary} />
        <Text style={styles.linkText}>Open in Google Maps</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12 },
  address: { color: Stitch.colors.onBackground, lineHeight: 20 },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  linkText: { color: Stitch.colors.primary, fontWeight: '600' },
});
