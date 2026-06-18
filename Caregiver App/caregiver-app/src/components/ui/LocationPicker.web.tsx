import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import { Stitch } from '@/theme/stitch';
import { DEFAULT_MAP_REGION, type LocationValue } from '@/lib/locationTypes';
import { getPlaceDetails, reverseGeocode, searchPlaces } from '@/lib/geo';
import { locationPickerStyles as styles } from '@/components/ui/locationPickerStyles';

type Props = {
  value?: LocationValue | null;
  onChange: (location: LocationValue) => void;
  label?: string;
  placeholder?: string;
  height?: number;
};

export function LocationPicker({
  value,
  onChange,
  label = 'Location',
  placeholder = 'Search area, street, or landmark',
  height = 220,
}: Props) {
  const [query, setQuery] = useState(value?.address || '');
  const [predictions, setPredictions] = useState<
    Awaited<ReturnType<typeof searchPlaces>>
  >([]);
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [anchor, setAnchor] = useState({
    latitude: value?.latitude ?? DEFAULT_MAP_REGION.latitude,
    longitude: value?.longitude ?? DEFAULT_MAP_REGION.longitude,
  });

  useEffect(() => {
    if (!query.trim() || query === value?.address) {
      setPredictions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchPlaces(query, anchor);
        setPredictions(results);
      } catch {
        setPredictions([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query, anchor.latitude, anchor.longitude, value?.address]);

  const applyLocation = (location: LocationValue) => {
    onChange(location);
    setQuery(location.address);
    setPredictions([]);
    setAnchor({ latitude: location.latitude, longitude: location.longitude });
  };

  const pickPrediction = async (placeId: string) => {
    setResolving(true);
    try {
      const location = await getPlaceDetails(placeId);
      applyLocation(location);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      Alert.alert('Location error', err.response?.data?.message || 'Could not load place');
    } finally {
      setResolving(false);
    }
  };

  const useCurrentLocation = async () => {
    setResolving(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow location access to use your current position.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const location = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      applyLocation(location);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      Alert.alert('Location error', err.response?.data?.message || 'Could not read GPS location.');
    } finally {
      setResolving(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.searchRow}>
        <MaterialIcons name="search" size={20} color={Stitch.colors.onSurfaceVariant} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder}
          placeholderTextColor={Stitch.colors.onSurfaceVariant + '99'}
          style={styles.input}
        />
        {searching || resolving ? (
          <ActivityIndicator size="small" color={Stitch.colors.secondary} />
        ) : null}
      </View>

      {predictions.length > 0 ? (
        <View style={styles.suggestions}>
          <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            {predictions.map((p) => (
              <TouchableOpacity
                key={p.placeId}
                style={styles.suggestionRow}
                onPress={() => pickPrediction(p.placeId)}
              >
                <MaterialIcons name="place" size={18} color={Stitch.colors.secondary} />
                <View style={styles.suggestionText}>
                  <Text style={styles.suggestionMain}>{p.mainText}</Text>
                  {p.secondaryText ? (
                    <Text style={styles.suggestionSub}>{p.secondaryText}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={[styles.webHint, { minHeight: height / 2 }]}>
        <MaterialIcons name="map" size={28} color={Stitch.colors.secondary} />
        <Text style={styles.webHintText}>
          Search for an address above or use your current location. Interactive map is available in
          the Android/iOS app.
        </Text>
      </View>

      <TouchableOpacity style={styles.gpsBtn} onPress={useCurrentLocation} disabled={resolving}>
        <MaterialIcons name="my-location" size={18} color={Stitch.colors.primary} />
        <Text style={styles.gpsText}>Use current location</Text>
      </TouchableOpacity>

      {value ? (
        <Text style={styles.selected}>
          {value.address}
          {value.city ? ` · ${value.city}` : ''}
        </Text>
      ) : (
        <Text style={styles.hint}>Search for a place or use GPS to set location.</Text>
      )}
    </View>
  );
}
