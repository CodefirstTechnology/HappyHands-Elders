import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Stitch } from '@/theme/stitch';
import { mapViewProps } from '@/lib/mapsConfig';

type Props = {
  destination?: { latitude: number; longitude: number } | null;
  enabled: boolean;
  height?: number;
};

export function LiveLocationMap({ destination, enabled, height = 200 }: Props) {
  const mapRef = useRef<MapView>(null);
  const [current, setCurrent] = useState<{ latitude: number; longitude: number } | null>(null);
  const [region, setRegion] = useState<Region | null>(null);

  useEffect(() => {
    if (!enabled) {
      setCurrent(null);
      return;
    }

    let subscription: Location.LocationSubscription | undefined;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 15,
          timeInterval: 5000,
        },
        (pos) => {
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          setCurrent(coords);

          const points = [coords];
          if (destination) points.push(destination);

          const lats = points.map((p) => p.latitude);
          const lngs = points.map((p) => p.longitude);
          const minLat = Math.min(...lats);
          const maxLat = Math.max(...lats);
          const minLng = Math.min(...lngs);
          const maxLng = Math.max(...lngs);

          setRegion({
            latitude: (minLat + maxLat) / 2,
            longitude: (minLng + maxLng) / 2,
            latitudeDelta: Math.max(0.01, (maxLat - minLat) * 1.6),
            longitudeDelta: Math.max(0.01, (maxLng - minLng) * 1.6),
          });
        },
      );
    })();

    return () => subscription?.remove();
  }, [enabled, destination?.latitude, destination?.longitude]);

  useEffect(() => {
    if (region) mapRef.current?.animateToRegion(region, 500);
  }, [region]);

  if (!enabled) return null;

  const initial = region ||
    (destination
      ? {
          ...destination,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }
      : {
          latitude: 19.076,
          longitude: 72.8777,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });

  return (
    <View style={[styles.wrap, { height }]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={initial}
        showsUserLocation
        showsMyLocationButton
        {...mapViewProps()}
      >
        {destination ? (
          <Marker coordinate={destination} title="Job location" pinColor={Stitch.colors.primary} />
        ) : null}
        {current ? (
          <Marker coordinate={current} title="Your location" pinColor={Stitch.colors.secondary} />
        ) : null}
      </MapView>
      <Text style={styles.caption}>Live location updates while you are on duty</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: Stitch.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Stitch.colors.outlineVariant,
    marginBottom: 8,
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
    overflow: 'hidden',
  },
});
