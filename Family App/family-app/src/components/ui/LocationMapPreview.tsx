import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import { Stitch } from '@/theme/stitch';
import { mapsDeepLink } from '@/lib/locationTypes';
import { mapViewProps } from '@/lib/mapsConfig';

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
  height = 180,
}: Props) {
  if (latitude == null || longitude == null) {
    return null;
  }

  const openMaps = () => {
    Linking.openURL(mapsDeepLink(latitude, longitude, address || undefined));
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.mapWrap, { height }]}>
        <MapView
          style={StyleSheet.absoluteFill}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          {...mapViewProps()}
          initialRegion={{
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          <Marker coordinate={{ latitude, longitude }} />
        </MapView>
      </View>
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
  mapWrap: {
    borderRadius: Stitch.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Stitch.colors.outlineVariant,
  },
  address: { marginTop: 10, color: Stitch.colors.onBackground, lineHeight: 20 },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  linkText: { color: Stitch.colors.primary, fontWeight: '600' },
});
