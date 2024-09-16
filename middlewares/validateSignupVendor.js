const validator = require("validator");
const Vendor = require("./../models/vendorModel");
const User = require("./../models/userModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

const validateSignupFields = catchAsync(async (req, res, next) => {
  const { email, password, passwordConfirm } = req.body;

  // Validate email
  if (!email || !validator.isEmail(email)) {
    return next(new AppError("Please provide a valid email address.", 400));
  }

  // Check if email already exists in User or Vendor collections
  const user = await User.findOne({ email });
  const vendor = await Vendor.findOne({ email });
  const existingUser = user || vendor;

  if (existingUser) {
    // If an unverified vendor exists, delete the old entry
    if (existingUser && !existingUser.isVerified) {
      await Vendor.deleteOne({ _id: existingUser._id });
    } else {
      // If the user is already verified or the token has not expired
      return next(
        new AppError(
          "User with this email already exists. Please use another email.",
          400
        )
      );
    }
  }

  // Validate password (at least 8 characters)
  if (!password || password.length < 8) {
    return next(
      new AppError("Password must be at least 8 characters long.", 400)
    );
  }

  // Validate password confirmation
  if (!passwordConfirm || password !== passwordConfirm) {
    return next(new AppError("Passwords do not match.", 400));
  }

  // If all validations pass, proceed to the next middleware or function
  next();
});

module.exports = validateSignupFields;
