// FILE: services/location.service.js

const generateLocationLink = (lat, lng) => {
  if (lat === undefined || lng === undefined) {
    throw new Error('Latitude and longitude are required');
  }

  const latitude = Number(lat);
  const longitude = Number(lng);

  if (isNaN(latitude) || isNaN(longitude)) {
    throw new Error('Invalid latitude or longitude');
  }

  return {
    lat: latitude,
    lng: longitude,
    mapLink: `https://maps.google.com/?q=${latitude},${longitude}`,
  };
};

module.exports = {
  generateLocationLink,
};