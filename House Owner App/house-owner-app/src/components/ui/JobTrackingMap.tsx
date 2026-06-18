import { useEffect, useRef } from 'react';
import { Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { Stitch } from '@/theme/stitch';
import { formatTime } from '@/lib/i18n/format';
import { mapViewProps } from '@/lib/mapsConfig';
import { mapsDeepLink } from '@/lib/locationTypes';
import { VisitAddressBanner } from '@/components/ui/VisitAddressBanner';
import type { VisitAddressParts } from '@/lib/visitAddress';

type Coord = { latitude: number; longitude: number };

type Props = {
  home?: Coord | null;
  caregiver?: Coord | null;
  height?: number;
  lastUpdated?: string | null;
  visitAddress?: VisitAddressParts | null;
};

function fitRegion(points: Coord[]): Region {
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(0.012, (maxLat - minLat) * 1.5),
    longitudeDelta: Math.max(0.012, (maxLng - minLng) * 1.5),
  };
}

export function JobTrackingMap({
  home,
  servant,
  height = 220,
  lastUpdated,
  visitAddress,
}: Props) {
  const { t } = useTranslation();
  const mapRef = useRef<MapView>(null);

  const points: Coord[] = [];
  if (home) points.push(home);
  if (servant) points.push(servant);

  useEffect(() => {
    if (points.length < 1) return;
    mapRef.current?.animateToRegion(fitRegion(points), 400);
  }, [home?.latitude, home?.longitude, servant?.latitude, servant?.longitude]);

  if (!home) return null;

  const initial = points.length > 0 ? fitRegion(points) : { ...home, latitudeDelta: 0.02, longitudeDelta: 0.02 };

  const openHome = () =>
    Linking.openURL(mapsDeepLink(home.latitude, home.longitude, t('bookings.mapPinHome')));

  const caption = servant
    ? t('bookings.trackingCaption', {
        time: lastUpdated ? formatTime(lastUpdated) : '…',
      })
    : t('bookings.waitingHelperLocation');

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>{t('bookings.liveTracking')}</Text>
      {visitAddress ? <VisitAddressBanner parts={visitAddress} /> : null}
      <View style={[styles.mapBox, { height }]}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={initial}
          {...mapViewProps()}
        >
          <Marker coordinate={home} title={t('bookings.mapPinHome')} pinColor={Stitch.colors.primary} />
          {servant ? (
            <Marker coordinate={servant} title={t('bookings.mapPinHelper')} pinColor={Stitch.colors.secondary} />
          ) : null}
        </MapView>
        <Text style={styles.caption}>{caption}</Text>
      </View>
      <TouchableOpacity style={styles.btn} onPress={openHome}>
        <MaterialIcons name="home" size={18} color={Stitch.colors.primary} />
        <Text style={styles.btnText}>{t('bookings.yourHomeBtn')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Stitch.colors.primary, marginBottom: 8 },
  mapBox: {
    borderRadius: Stitch.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Stitch.colors.outlineVariant,
  },
  caption: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    fontSize: 11,
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Stitch.colors.primary,
  },
  btnText: { color: Stitch.colors.primary, fontWeight: '700', fontSize: 13 },
});
