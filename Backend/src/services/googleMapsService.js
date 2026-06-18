const ApiError = require("../utils/ApiError");

const getApiKey = () => {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    throw new ApiError(
      503,
      "Google Maps is not configured. Set GOOGLE_MAPS_API_KEY on the backend."
    );
  }
  return key;
};

const fetchGoogle = async (url) => {
  const res = await fetch(url);
  const data = await res.json();
  if (data.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new ApiError(502, data.error_message || `Google Maps error: ${data.status}`);
  }
  return data;
};

const extractCity = (addressComponents = []) => {
  const pick = (type) =>
    addressComponents.find((c) => c.types?.includes(type))?.long_name;
  return (
    pick("locality") ||
    pick("administrative_area_level_2") ||
    pick("administrative_area_level_1") ||
    null
  );
};

exports.autocomplete = async ({ input, latitude, longitude }) => {
  if (!input || input.trim().length < 2) {
    return { predictions: [] };
  }

  const key = getApiKey();
  const params = new URLSearchParams({
    input: input.trim(),
    key,
    components: "country:in",
    types: "geocode|establishment"
  });

  if (latitude != null && longitude != null) {
    params.set("location", `${latitude},${longitude}`);
    params.set("radius", "50000");
  }

  const data = await fetchGoogle(
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`
  );

  return {
    predictions: (data.predictions || []).map((p) => ({
      placeId: p.place_id,
      description: p.description,
      mainText: p.structured_formatting?.main_text || p.description,
      secondaryText: p.structured_formatting?.secondary_text || ""
    }))
  };
};

exports.placeDetails = async (placeId) => {
  if (!placeId) throw new ApiError(400, "placeId is required");

  const key = getApiKey();
  const params = new URLSearchParams({
    place_id: placeId,
    key,
    fields: "formatted_address,geometry,address_components,name"
  });

  const data = await fetchGoogle(
    `https://maps.googleapis.com/maps/api/place/details/json?${params}`
  );

  const result = data.result;
  if (!result?.geometry?.location) {
    throw new ApiError(404, "Place not found");
  }

  return {
    address: result.formatted_address || result.name,
    latitude: result.geometry.location.lat,
    longitude: result.geometry.location.lng,
    city: extractCity(result.address_components)
  };
};

exports.reverseGeocode = async (latitude, longitude) => {
  if (latitude == null || longitude == null) {
    throw new ApiError(400, "latitude and longitude are required");
  }

  const key = getApiKey();
  const params = new URLSearchParams({
    latlng: `${latitude},${longitude}`,
    key
  });

  const data = await fetchGoogle(
    `https://maps.googleapis.com/maps/api/geocode/json?${params}`
  );

  const result = data.results?.[0];
  if (!result) {
    throw new ApiError(404, "No address found for this location");
  }

  return {
    address: result.formatted_address,
    latitude,
    longitude,
    city: extractCity(result.address_components)
  };
};

exports.fetchStaticMap = async (latitude, longitude) => {
  const key = getApiKey();
  const params = new URLSearchParams({
    center: `${latitude},${longitude}`,
    zoom: "15",
    size: "640x320",
    scale: "2",
    maptype: "roadmap",
    markers: `color:0x15157d|${latitude},${longitude}`,
    key
  });

  const mapId = process.env.GOOGLE_MAP_ID?.trim();
  if (mapId) params.set("map_id", mapId);

  const url = `https://maps.googleapis.com/maps/api/staticmap?${params}`;
  const res = await fetch(url);
  if (!res.ok) {
    const hint =
      res.status === 403
        ? "Google Maps API key denied (enable Static Maps API and check key restrictions)"
        : "Could not load map preview";
    throw new ApiError(502, hint);
  }
  return res.arrayBuffer();
};
