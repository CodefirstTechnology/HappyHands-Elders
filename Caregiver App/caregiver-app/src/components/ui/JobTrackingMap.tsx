import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Stitch } from '@/theme/stitch';
import { mapViewProps } from '@/lib/mapsConfig';
import { mapsDirectionsUrl } from '@/lib/locationTypes';
import { VisitAddressBanner } from '@/components/ui/VisitAddressBanner';
import type { VisitAddressParts } from '@/lib/visitAddress';

type Coord = { latitude: number; longitude: number };

type Props = {
  home?: Coord | null;
  homeLabel?: string;
  caregiver?: Coord | null;
  showMyLocation?: boolean;
  showMapInitially?: boolean;
  height?: number;
  caption?: string;
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
  homeLabel,
  servant,
  showMyLocation = false,
  showMapInitially = false,
  height = 220,
  caption,
  visitAddress,
}: Props) {
  const { t } = useTranslation();
  const resolvedHomeLabel = homeLabel ?? t('bookings.customerHome');
  const mapRef = useRef<MapView>(null);
  const [mapVisible, setMapVisible] = useState(showMapInitially);
  const [myLocation, setMyLocation] = useState<Coord | null>(null);

  useEffect(() => {
    if (!showMyLocation || !mapVisible) return;
    let sub: Location.LocationSubscription | undefined;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 20, timeInterval: 8000 },
        (p) =>
          setMyLocation({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      );
    })();
    return () => sub?.remove();
  }, [showMyLocation, mapVisible]);

  const points: Coord[] = [];
  if (home) points.push(home);
  if (servant) points.push(servant);
  if (myLocation) points.push(myLocation);

  useEffect(() => {
    if (!mapVisible || points.length < 1) return;
    mapRef.current?.animateToRegion(fitRegion(points), 400);
  }, [
    mapVisible,
    home?.latitude,
    home?.longitude,
    servant?.latitude,
    servant?.longitude,
    myLocation?.latitude,
    myLocation?.longitude,
  ]);

  if (!home) return null;

  const initial = points.length > 0 ? fitRegion(points) : { ...home, latitudeDelta: 0.02, longitudeDelta: 0.02 };

  const openExternalDirections = () => {
    const origin = myLocation || servant || null;
    Linking.openURL(mapsDirectionsUrl(home, origin));
  };

  const showMap = () => setMapVisible(true);

  return (
    <View style={styles.wrap}>
      {visitAddress ? <VisitAddressBanner parts={visitAddress} /> : null}
      {mapVisible ? (
        <View style={[styles.mapBox, { height }]}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={initial}
            showsUserLocation={showMyLocation}
            {...mapViewProps()}
          >
            <Marker coordinate={home} title={resolvedHomeLabel} pinColor={Stitch.colors.primary} />
            {servant ? (
              <Marker coordinate={servant} title={t('bookings.helperMarker')} pinColor={Stitch.colors.secondary} />
            ) : null}
          </MapView>
          {caption ? <Text style={styles.caption}>{caption}</Text> : null}
        </View>
      ) : caption ? (
        <Text style={styles.hint}>{caption}</Text>
      ) : null}
      {mapVisible ? (
        <TouchableOpacity style={styles.dirBtn} onPress={openExternalDirections}>
          <MaterialIcons name="navigation" size={20} color="#fff" />
          <Text style={styles.dirText}>{t('bookings.openInGoogleMaps')}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.dirBtn} onPress={showMap}>
          <MaterialIcons name="directions" size={20} color="#fff" />
          <Text style={styles.dirText}>{t('bookings.directionsToHome')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12 },
  hint: {
    fontSize: 13,
    color: Stitch.colors.onSurfaceVariant,
    marginBottom: 10,
  },
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
  dirBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Stitch.colors.primary,
    paddingVertical: 12,
    borderRadius: Stitch.radius.lg,
    marginTop: 10,
  },
  dirText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
