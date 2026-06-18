const googleMaps = require("../services/googleMapsService");
const { sendSuccess } = require("../utils/response");

exports.autocomplete = async (req, res) => {
  const { input, latitude, longitude } = req.query;
  const data = await googleMaps.autocomplete({
    input,
    latitude: latitude != null ? Number(latitude) : undefined,
    longitude: longitude != null ? Number(longitude) : undefined
  });
  sendSuccess(res, data);
};

exports.placeDetails = async (req, res) => {
  const data = await googleMaps.placeDetails(req.query.placeId);
  sendSuccess(res, data);
};

exports.reverseGeocode = async (req, res) => {
  const { latitude, longitude } = req.query;
  const data = await googleMaps.reverseGeocode(Number(latitude), Number(longitude));
  sendSuccess(res, data);
};

exports.mapPreview = async (req, res) => {
  const { latitude, longitude } = req.query;
  const buffer = await googleMaps.fetchStaticMap(Number(latitude), Number(longitude));
  res.set("Content-Type", "image/png");
  res.set("Cache-Control", "public, max-age=3600");
  res.send(Buffer.from(buffer));
};
