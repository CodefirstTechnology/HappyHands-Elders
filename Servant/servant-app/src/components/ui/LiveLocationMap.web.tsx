import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import { Stitch } from '@/theme/stitch';
import { mapsDeepLink } from '@/lib/locationTypes';

type Props = {
  destination?: { latitude: number; longitude: number } | null;
  enabled: boolean;
  height?: number;
};

export function LiveLocationMap({ destination, enabled, height = 200 }: Props) {
  const [current, setCurrent] = useState<{ latitude: number; longitude: number } | null>(null);

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
          setCurrent({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
      );
    })();

    return () => subscription?.remove();
  }, [enabled]);

  if (!enabled) return null;

  const openCurrent = () => {
    if (!current) return;
    Linking.openURL(mapsDeepLink(current.latitude, current.longitude, 'Your location'));
  };

  const openJob = () => {
    if (!destination) return;
    Linking.openURL(mapsDeepLink(destination.latitude, destination.longitude, 'Job location'));
  };

  return (
    <View style={[styles.wrap, { minHeight: height / 2 }]}>
      <MaterialIcons name="my-location" size={28} color={Stitch.colors.secondary} />
      <Text style={styles.title}>Live location (web)</Text>
      <Text style={styles.hint}>
        GPS updates while you are on duty. Open Google Maps for turn-by-turn navigation — full
        map view is on Android/iOS.
      </Text>
      {current ? (
        <Text style={styles.coords}>
          You: {current.latitude.toFixed(5)}, {current.longitude.toFixed(5)}
        </Text>
      ) : (
        <Text style={styles.coords}>Waiting for GPS…</Text>
      )}
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.btn, !current && styles.btnDisabled]}
          onPress={openCurrent}
          disabled={!current}
        >
          <Text style={styles.btnText}>Your location</Text>
        </TouchableOpacity>
        {destination ? (
          <TouchableOpacity style={styles.btn} onPress={openJob}>
            <Text style={styles.btnText}>Job location</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: Stitch.radius.lg,
    borderWidth: 1,
    borderColor: Stitch.colors.outlineVariant,
    padding: 16,
    marginBottom: 8,
    alignItems: 'center',
    backgroundColor: Stitch.colors.surfaceContainerLow,
  },
  title: { fontSize: 15, fontWeight: '700', color: Stitch.colors.primary, marginTop: 8 },
  hint: {
    fontSize: 13,
    color: Stitch.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  coords: { fontSize: 12, color: Stitch.colors.onBackground, marginTop: 10 },
  row: { flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' },
  btn: {
    backgroundColor: Stitch.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});
