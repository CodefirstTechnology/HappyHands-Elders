export type GeoPrediction = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

export type GeoLocation = {
  address: string;
  city?: string | null;
  latitude: number;
  longitude: number;
};

export type LocationValue = GeoLocation;

export const DEFAULT_MAP_REGION = {
  latitude: 19.076,
  longitude: 72.8777,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export function mapsDeepLink(latitude: number, longitude: number, label?: string) {
  const query = label
    ? encodeURIComponent(`${label}@${latitude},${longitude}`)
    : `${latitude},${longitude}`;
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

/** Turn-by-turn directions in Google Maps (optional origin = current location). */
export function mapsDirectionsUrl(
  destination: { latitude: number; longitude: number },
  origin?: { latitude: number; longitude: number } | null,
) {
  const dest = `${destination.latitude},${destination.longitude}`;
  const params = new URLSearchParams({
    api: '1',
    destination: dest,
    travelmode: 'driving',
  });
  if (origin) params.set('origin', `${origin.latitude},${origin.longitude}`);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
