import api from './api'

export async function searchPlaces(input, coords) {
  const params = { input }
  if (coords?.latitude != null && coords?.longitude != null) {
    params.latitude = String(coords.latitude)
    params.longitude = String(coords.longitude)
  }
  const res = await api.get('/geo/autocomplete', { params })
  return res.data.data.predictions
}

export async function getPlaceDetails(placeId) {
  const res = await api.get('/geo/place-details', { params: { placeId } })
  return res.data.data
}

export async function reverseGeocode(latitude, longitude) {
  const res = await api.get('/geo/reverse', {
    params: { latitude, longitude },
  })
  return res.data.data
}
