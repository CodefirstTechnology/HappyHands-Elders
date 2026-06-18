import api from '@/lib/api';
import type { GeoLocation, GeoPrediction } from '@/lib/locationTypes';

export async function searchPlaces(
  input: string,
  coords?: { latitude: number; longitude: number },
): Promise<GeoPrediction[]> {
  const params: Record<string, string> = { input };
  if (coords) {
    params.latitude = String(coords.latitude);
    params.longitude = String(coords.longitude);
  }
  const res = await api.get('/geo/autocomplete', { params });
  return res.data.data.predictions as GeoPrediction[];
}

export async function getPlaceDetails(placeId: string): Promise<GeoLocation> {
  const res = await api.get('/geo/place-details', { params: { placeId } });
  return res.data.data as GeoLocation;
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<GeoLocation> {
  const res = await api.get('/geo/reverse', { params: { latitude, longitude } });
  return res.data.data as GeoLocation;
}
