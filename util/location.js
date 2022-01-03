const axios = require("axios");
const HttpError = require("../models/http-error");
const API_KEY = process.env.RADAR_API_KEY;

async function getCoordinatesForAddress(address) {
  const url = "https://api.radar.io/v1/geocode/forward";
  const config = {
    headers: {
      authorization: API_KEY,
    },
    params: { query: address },
  };
  const response = await axios.get(url, config);
  const data = response.data;
  if (!data || data.addresses.length < 1) {
    throw new HttpError(
      "Could not find location for the specified address.",
      422
    );
  }

  const identifiedAddress = data.addresses[0];
  const coordinates = {
    lat: identifiedAddress.latitude,
    lng: identifiedAddress.longitude,
    address: `${identifiedAddress.addressLabel}, ${identifiedAddress.city}, ${identifiedAddress.state}, ${identifiedAddress.country}`,
  };
  return coordinates;
}

module.exports = getCoordinatesForAddress;
