const axios = require("axios");
const AppError = require("./appError");
const catchAsync = require("./catchAsync");

const preprocessAddress = (address) => {
  // Split the address into parts using a comma as delimiter
  const addressParts = address.split(",");

  // Remove the first part of the address and trim any extra spaces
  const remainingAddress = addressParts.slice(1).join(",").trim();

  return remainingAddress;
};

// Function to get coordinates from address
const getCoordinatesFromAddress = async (address) => {
  try {
    const processedAddress = preprocessAddress(address);

    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/geocode/json",
      {
        params: {
          address: processedAddress,
          key: process.env.GOOGLE_MAPS_API_KEY, // Ensure you have this environment variable set
        },
      }
    );

    console.log("Google Maps Response:", response.data);

    if (response.data.status !== "OK" || response.data.results.length === 0) {
      throw new Error(`No coordinates found for address: ${processedAddress}`);
    }

    const location = response.data.results[0].geometry.location;
    if (location) {
      return [parseFloat(location.lng), parseFloat(location.lat)];
    } else {
      throw new Error(
        `No location data found for address: ${processedAddress}`
      );
    }
  } catch (error) {
    console.error(
      `Error fetching coordinates for address: ${address}`,
      error.message
    );
    throw new Error("Failed to fetch coordinates");
  }
};

const getAddressFromCoordinates = catchAsync(async (req, res, next) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return next(new AppError("Latitude and longitude are required", 400));
    }

    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/geocode/json",
      {
        params: {
          latlng: `${lat},${lng}`,
          key: process.env.GOOGLE_MAPS_API_KEY,
        },
      }
    );

    console.log("Google Maps Reverse Geocoding Response:", response.data);

    if (response.data.status !== "OK" || response.data.results.length === 0) {
      return next(
        new AppError(`No address found for coordinates: ${lat}, ${lng}`, 404)
      );
    }

    const address = response.data.results[0].formatted_address;
    res.json({ address });
  } catch (error) {
    console.error("Error fetching address from coordinates:", error);
    next(new AppError("An error occurred while fetching the address", 500));
  }
});
module.exports = { getCoordinatesFromAddress, getAddressFromCoordinates };
