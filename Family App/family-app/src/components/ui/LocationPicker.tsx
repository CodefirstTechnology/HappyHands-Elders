import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { Stitch } from '@/theme/stitch';
import { DEFAULT_MAP_REGION, type LocationValue } from '@/lib/locationTypes';
import { getPlaceDetails, reverseGeocode, searchPlaces } from '@/lib/geo';
import { locationPickerStyles as styles } from '@/components/ui/locationPickerStyles';
import { mapViewProps } from '@/lib/mapsConfig';

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
  label,
  placeholder,
  height = 220,
}: Props) {
  const { t } = useTranslation();
  const pickerLabel = label ?? t('location.label');
  const pickerPlaceholder = placeholder ?? t('location.placeholder');
  const mapRef = useRef<MapView>(null);
  const [query, setQuery] = useState(value?.address || '');
  const [predictions, setPredictions] = useState<
    Awaited<ReturnType<typeof searchPlaces>>
  >([]);
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [region, setRegion] = useState<Region>(() =>
    value
      ? {
          latitude: value.latitude,
          longitude: value.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }
      : DEFAULT_MAP_REGION,
  );

  useEffect(() => {
    if (!query.trim() || query === value?.address) {
      setPredictions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchPlaces(query, {
          latitude: region.latitude,
          longitude: region.longitude,
        });
        setPredictions(results);
      } catch {
        setPredictions([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query, region.latitude, region.longitude, value?.address]);

  const applyLocation = async (location: LocationValue) => {
    onChange(location);
    setQuery(location.address);
    setPredictions([]);
    const nextRegion = {
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };
    setRegion(nextRegion);
    mapRef.current?.animateToRegion(nextRegion, 400);
  };

  const resolveCoords = async (latitude: number, longitude: number) => {
    setResolving(true);
    try {
      const location = await reverseGeocode(latitude, longitude);
      await applyLocation(location);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      Alert.alert(
        t('location.errorTitle'),
        err.response?.data?.message || t('location.couldNotResolve'),
      );
    } finally {
      setResolving(false);
    }
  };

  const pickPrediction = async (placeId: string) => {
    setResolving(true);
    try {
      const location = await getPlaceDetails(placeId);
      await applyLocation(location);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      Alert.alert(
        t('location.errorTitle'),
        err.response?.data?.message || t('location.couldNotLoadPlace'),
      );
    } finally {
      setResolving(false);
    }
  };

  const useCurrentLocation = async () => {
    setResolving(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('location.permissionTitle'), t('location.permissionBody'));
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await resolveCoords(pos.coords.latitude, pos.coords.longitude);
    } catch {
      Alert.alert(t('location.errorTitle'), t('location.couldNotReadGps'));
    } finally {
      setResolving(false);
    }
  };

  const marker = value
    ? { latitude: value.latitude, longitude: value.longitude }
    : null;

  return (
    <View style={styles.wrap}>
      {pickerLabel ? <Text style={styles.label}>{pickerLabel}</Text> : null}
      <View style={styles.searchRow}>
        <MaterialIcons name="search" size={20} color={Stitch.colors.onSurfaceVariant} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={pickerPlaceholder}
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

      <View style={[styles.mapWrap, { height }]}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={region}
          showsUserLocation
          {...mapViewProps()}
          onPress={(e) =>
            resolveCoords(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude)
          }
        >
          {marker ? (
            <Marker
              coordinate={marker}
              draggable
              onDragEnd={(e) =>
                resolveCoords(
                  e.nativeEvent.coordinate.latitude,
                  e.nativeEvent.coordinate.longitude,
                )
              }
            />
          ) : null}
        </MapView>
      </View>

      <TouchableOpacity style={styles.gpsBtn} onPress={useCurrentLocation} disabled={resolving}>
        <MaterialIcons name="my-location" size={18} color={Stitch.colors.primary} />
        <Text style={styles.gpsText}>{t('location.useCurrentLocation')}</Text>
      </TouchableOpacity>

      {value ? (
        <Text style={styles.selected}>
          {value.address}
          {value.city ? ` · ${value.city}` : ''}
        </Text>
      ) : (
        <Text style={styles.hint}>{t('location.pickHint')}</Text>
      )}
    </View>
  );
}
