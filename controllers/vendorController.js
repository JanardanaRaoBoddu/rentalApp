const catchAsync = require("../utils/catchAsync");
const Vendor = require("./../models/vendorModel");
const AppError = require("../utils/appError");
const getCoordinatesFromAddress = require("./../utils/map");

exports.getAllVendors = catchAsync(async (req, res) => {
  const vendors = await Vendor.find();

  res.status(200).json({
    status: "success",
    requestedAt: req.requestTime,
    results: vendors.length,
    data: {
      vendors,
    },
  });
});
exports.getVendour = (req, res) => {
  res
    .status(500)
    .json({ status: "Error", message: "This route is not yet defined" });
};
exports.createVendour = (req, res) => {
  res
    .status(500)
    .json({ status: "Error", message: "This route is not yet defined" });
};
exports.updateVendour = (req, res) => {
  res
    .status(500)
    .json({ status: "Error", message: "This route is not yet defined" });
};
exports.deleteVendour = (req, res) => {
  res
    .status(500)
    .json({ status: "Error", message: "This route is not yet defined" });
};

exports.addAddress = catchAsync(async (req, res, next) => {
  const {
    type,
    alias,
    addressLine1,
    addressLine2,
    city,
    state,
    country,
    pincode,
    currentLocation,
  } = req.body;
  // Validate required fields
  if (
    !type ||
    !alias ||
    !addressLine1 ||
    !city ||
    !state ||
    !country ||
    !pincode
  ) {
    return next(new AppError("Missing required fields", 400));
  }

  const user = await Vendor.findById(req.user.id);

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  // Determine coordinates
  let coordinates;

  if (currentLocation) {
    // If current location is provided, use it
    coordinates = currentLocation;
  } else {
    // Otherwise, use the address string to get coordinates
    const addressString = `${addressLine1}, ${addressLine2 || ""}, ${city}, ${state}, ${country}, ${pincode}`;
    try {
      coordinates = await getCoordinatesFromAddress(addressString);
    } catch (error) {
      return next(
        new AppError("Could not determine coordinates for the address", 400)
      );
    }
  }
  const newAddress = {
    type,
    alias,
    addressLine1,
    addressLine2,
    city,
    state,
    country,
    pincode,
    location: {
      type: "Point",
      coordinates,
    },
  };

  user.addresses.push(newAddress);
  await user.save({ validateModifiedOnly: true });
  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
});

// exports.updateAddress = catchAsync(async (req, res, next) => {
//   const user = await Vendor.findById(req.user.id);
//   if (!user) {
//     return next(new AppError("User not found", 404));
//   }

//   const address = user.addresses.id(req.params.addressId);
//   if (!address) {
//     return next(new AppError("Address not found", 404));
//   }

//   // Update only the fields provided in the req.body
//   Object.assign(address, req.body);
//   await user.save({ validateModifiedOnly: true });

//   res.status(200).json({
//     status: "success",
//     data: {
//       user,
//     },
//   });
// });

// Function to update an address
exports.updateAddress = catchAsync(async (req, res, next) => {
  const { addressId } = req.params;
  const {
    type,
    alias,
    addressLine1,
    addressLine2,
    city,
    state,
    country,
    pincode,
    currentLocation,
  } = req.body;

  // Validate required fields
  if (!addressId) {
    return next(new AppError("Address ID is required", 400));
  }

  const vendor = await Vendor.findById(req.user.id);
  if (!vendor) {
    return next(new AppError("User not found", 404));
  }

  const address = vendor.addresses.id(addressId);
  if (!address) {
    return next(new AppError("Address not found", 404));
  }

  // Determine coordinates
  let coordinates;
  if (currentLocation) {
    coordinates = currentLocation;
  } else {
    const addressString = `${addressLine1}, ${addressLine2 || ""}, ${city}, ${state}, ${country}, ${pincode}`;
    try {
      coordinates = await getCoordinatesFromAddress(addressString);
    } catch (error) {
      return next(
        new AppError("Could not determine coordinates for the address", 400)
      );
    }
  }

  // Update address fields
  address.type = type || address.type;
  address.alias = alias || address.alias;
  address.addressLine1 = addressLine1 || address.addressLine1;
  address.addressLine2 = addressLine2 || address.addressLine2;
  address.city = city || address.city;
  address.state = state || address.state;
  address.country = country || address.country;
  address.pincode = pincode || address.pincode;
  address.location.coordinates = coordinates;

  await vendor.save({ validateModifiedOnly: true });

  res.status(200).json({
    status: "success",
    data: {
      address,
    },
  });
});

// Function to delete an address
exports.deleteAddress = catchAsync(async (req, res, next) => {
  const { addressId } = req.params;

  if (!addressId) {
    return next(new AppError("Address ID is required", 400));
  }

  const vendor = await Vendor.findById(req.user.id);
  if (!vendor) {
    return next(new AppError("User not found", 404));
  }

  const address = vendor.addresses.id(addressId);
  if (!address) {
    return next(new AppError("Address not found", 404));
  }

  address.remove();
  await vendor.save({ validateModifiedOnly: true });

  res.status(204).json({
    status: "success",
    data: null,
  });
});
// Get Addresses
exports.getAddresses = catchAsync(async (req, res, next) => {
  const user = await Vendor.findById(req.user.id).select("addresses");
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      addresses: user.addresses,
    },
  });
});
