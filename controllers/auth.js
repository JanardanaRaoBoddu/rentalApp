const { promisify } = require("util");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const sendEmail = require("../utils/email");
const User = require("../models/userModel");
const Vendor = require("../models/vendorModel");
const admin = require("./../utils/firebaseAdmin");
const validateSignupFields = require("./../middlewares/validateSignupVendor");
const { getCoordinatesFromAddress } = require("./../utils/map");
const { uploadFileToS3, deleteUnusedFilesFromS3 } = require("./../utils/awsS3");

const { Http2ServerRequest } = require("http2");
const { token } = require("morgan");

const signToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// Send a JWT token as a response
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id, user.role);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") {
    cookieOptions.secure = true;
  }

  res.cookie("jwt", token, cookieOptions);

  // Remove sensitive data before sending the response
  user.password = undefined;
  user.passwordHistory = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

// filtering user data
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

// USER SIGNUP
// exports.userSignup = catchAsync(async (req, res,next)   => {
//   const { userName, email, password, passwordConfirm, phoneNumber, addresses } =
//     req.body;
//   const existingUser = await User.findOne({ email });
//   if (
//     existingUser &&
//     !existingUser.isVerified &&
//     existingUser.emailConfirmExpires < Date.now()
//   ) {
//     await User.deleteOne({ _id: existingUser._id });
//   } else if (existingUser) {
//     return next(
//       new AppError(
//         "User with this email already exists. Please use another email.",
//         400
//       )
//     );
//   }
//   const newUser = await User.create({
//     userName,
//     email,
//     password,
//     passwordConfirm,
//     phoneNumber,
//     addresses,
//     role: "user", // Default role is 'user'
//   });

//   const otp = crypto.randomInt(100000, 999999).toString();
//   newUser.emailConfirmToken = crypto
//     .createHash("sha256")
//     .update(otp)
//     .digest("hex");
//   newUser.emailConfirmExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

//   await newUser.save({ validateBeforeSave: false });

//   const message = `<p>Your OTP for email confirmation is: ${otp}</p>`;

//   try {
//     await sendEmail({
//       email: newUser.email,
//       subject: "Email Confirmation OTP",
//       message,
//     });

//     res.status(200).json({
//       status: "success",
//       message: "OTP sent to email successfully!",
//     });
//   } catch (error) {
//     newUser.emailConfirmToken = undefined;
//     newUser.emailConfirmExpires = undefined;
//     await newUser.save({ validateBeforeSave: false });

//     return next(
//       new AppError(
//         "There was an error sending the email. Try again later.",
//         500
//       )
//     );
//   }
// });

exports.signupUser = [
  validateSignupFields,
  catchAsync(async (req, res, next) => {
    const { email, password, passwordConfirm } = req.body;

    if (!email || !password || !passwordConfirm) {
      return next(
        new AppError(
          "Please provide email, password, and password confirmation.",
          400
        )
      );
    }

    if (password !== passwordConfirm) {
      return next(new AppError("Passwords do not match.", 400));
    }

    const existingUser = await User.findOne({ email });
    if (
      existingUser &&
      !existingUser.isVerified &&
      existingUser.emailConfirmExpires < Date.now()
    ) {
      await User.deleteOne({ _id: existingUser._id });
    } else if (existingUser) {
      return next(
        new AppError(
          "User with this email already exists. Please use another email.",
          400
        )
      );
    }

    const newUser = new User({
      email,
      password,
      passwordConfirm,
      role: "user",
    });

    const otp = crypto.randomInt(100000, 999999).toString();
    newUser.emailConfirmToken = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");
    newUser.emailConfirmExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await newUser.save({ validateBeforeSave: false });

    const message = `<p>Your OTP for email confirmation is: ${otp}</p>`;

    try {
      await sendEmail({
        email: newUser.email,
        subject: "Email Confirmation OTP",
        message,
      });

      res.status(200).json({
        status: "success",
        message: "OTP sent to email successfully!",
      });
    } catch (error) {
      newUser.emailConfirmToken = undefined;
      newUser.emailConfirmExpires = undefined;
      await newUser.save({ validateBeforeSave: false });

      return next(
        new AppError(
          "There was an error sending the email. Try again later.",
          500
        )
      );
    }
  }),
];

// exports.signupVendor = [
//   validateSignupFields,
//   catchAsync(async (req, res, next) => {
//     const { email, password, passwordConfirm } = req.body;

//     if (!email || !password || !passwordConfirm) {
//       return next(
//         new AppError(
//           "Please provide email, password, and password confirmation.",
//           400
//         )
//       );
//     }

//     if (password !== passwordConfirm) {
//       return next(new AppError("Passwords do not match.", 400));
//     }

//     const existingVendor = await Vendor.findOne({ email });
//     if (
//       existingVendor &&
//       !existingVendor.isVerified &&
//       existingVendor.emailConfirmExpires < Date.now()
//     ) {
//       await Vendor.deleteOne({ _id: existingVendor._id });
//     } else if (existingVendor) {
//       return next(
//         new AppError(
//           "Vendor with this email already exists. Please use another email.",
//           400
//         )
//       );
//     }

//     const newVendor = new Vendor({
//       email,
//       password,
//       passwordConfirm,
//       role: "vendor",
//     });

//     const otp = crypto.randomInt(100000, 999999).toString();
//     newVendor.emailConfirmToken = crypto
//       .createHash("sha256")
//       .update(otp)
//       .digest("hex");
//     newVendor.emailConfirmExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

//     await newVendor.save({ validateBeforeSave: false });

//     const message = `<p>Your OTP for email confirmation is: ${otp}</p>`;

//     try {
//       await sendEmail({
//         email: newVendor.email,
//         subject: "Email Confirmation OTP",
//         message,
//       });

//       res.status(200).json({
//         status: "success",
//         message: "OTP sent to email successfully!",
//       });
//     } catch (error) {
//       newVendor.emailConfirmToken = undefined;
//       newVendor.emailConfirmExpires = undefined;
//       await newVendor.save({ validateBeforeSave: false });

//       return next(
//         new AppError(
//           "There was an error sending the email. Try again later.",
//           500
//         )
//       );
//     }
//   }),
// ];

exports.signupVendor = [
  validateSignupFields,
  catchAsync(async (req, res, next) => {
    const { email, password, passwordConfirm } = req.body;

    // Check if email, password, and password confirmation are provided
    if (!email || !password || !passwordConfirm) {
      return next(
        new AppError(
          "Please provide email, password, and password confirmation.",
          400
        )
      );
    }

    // Check if passwords match
    if (password !== passwordConfirm) {
      return next(new AppError("Passwords do not match.", 400));
    }

    // Check if the vendor already exists
    const existingVendor = await Vendor.findOne({ email });

    console.log(existingVendor);
    // If an unverified vendor exists, delete the old entry
    if (existingVendor && !existingVendor.isVerified) {
      await Vendor.deleteOne({ _id: existingVendor._id });
    }
    // If a verified vendor exists, throw an error
    else if (existingVendor) {
      return next(
        new AppError(
          "Vendor with this email already exists. Please use another email.",
          400
        )
      );
    }

    // Create a new vendor
    const newVendor = new Vendor({
      email,
      password,
      role: "vendor",
    });

    // Generate and set OTP for email confirmation
    const otp = crypto.randomInt(100000, 999999).toString();
    newVendor.emailConfirmToken = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");
    newVendor.emailConfirmExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Save the new vendor to the database
    await newVendor.save({ validateBeforeSave: false });

    // Prepare the OTP email message
    const message = `<p>Your OTP for email confirmation is: ${otp}</p>`;

    try {
      // Attempt to send the OTP email
      await sendEmail({
        email: newVendor.email,
        subject: "Email Confirmation OTP",
        message,
      });

      // Respond with success message if email is sent
      res.status(200).json({
        status: "success",
        message: "OTP sent to email successfully!",
      });
    } catch (error) {
      // // Handle email sending errors
      // newVendor.emailConfirmToken = undefined;
      // newVendor.emailConfirmExpires = undefined;
      // await newVendor.save({ validateBeforeSave: false });

      // Rollback: Delete the vendor if email sending fails
      await Vendor.deleteOne({ _id: newVendor._id });

      return next(
        new AppError(
          "There was an error sending the email. Try again later.",
          500
        )
      );
    }
  }),
];

// RESEND VERIFICATION MAIL
exports.resendEmailVerification = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  // Check if user or vendor exists
  const user = await User.findOne({ email });
  const vendor = await Vendor.findOne({ email });

  if (!user && !vendor) {
    return next(new AppError("There is no user with this email", 404));
  }

  let currentUser = user || vendor;

  if (currentUser.isVerified) {
    return next(new AppError("This email is already verified.", 400));
  }

  const otp = crypto.randomInt(100000, 999999).toString();
  currentUser.emailConfirmToken = crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");
  currentUser.emailConfirmExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  await currentUser.save({ validateBeforeSave: false });

  const message = `<p>Your OTP for email confirmation is: ${otp}</p>`;

  try {
    await sendEmail({
      email: currentUser.email,
      subject: "Email Confirmation OTP",
      message,
    });

    res.status(200).json({
      status: "success",
      message: "OTP sent to email successfully!",
    });
  } catch (error) {
    currentUser.emailConfirmToken = undefined;
    currentUser.emailConfirmExpires = undefined;
    await currentUser.save({ validateBeforeSave: false });

    return next(
      new AppError(
        "There was an error sending the email. Try again later.",
        500
      )
    );
  }
});

// Verify email
exports.verifyEmail = catchAsync(async (req, res, next) => {
  const { email, otp } = req.body;
  const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");

  // Find vendor or user with the email and valid token
  let account = await Vendor.findOne({
    email,
    emailConfirmToken: hashedOTP,
    emailConfirmExpires: { $gt: Date.now() },
  });

  if (!account) {
    account = await User.findOne({
      email,
      emailConfirmToken: hashedOTP,
      emailConfirmExpires: { $gt: Date.now() },
    });
  }

  // Check if the account exists and the token is valid
  if (!account) {
    return next(new AppError("OTP is invalid or has expired", 400));
  }

  // Check if the email is already verified
  if (account.isVerified) {
    return next(new AppError("Email is already verified", 400));
  }

  // Update account's verification status
  account.isVerified = true;
  account.emailConfirmToken = undefined;
  account.emailConfirmExpires = undefined;
  await account.save({ validateBeforeSave: false });

  // Create and send JWT token in response
  const token = createSendToken(account, 200, res);
  res.status(200).json({
    status: "success",
    token,
    message: "Email verified! You can now complete your profile.",
  });
});

exports.completeProfileUser = catchAsync(async (req, res, next) => {
  try {
    const { firstName, lastName, phoneNumber, addresses, termsAndConditions } =
      req.body;

    // Check if terms and conditions are accepted
    if (!termsAndConditions) {
      return next(
        new AppError("You must accept the terms and conditions.", 400)
      );
    }

    // Ensure user is logged in and verified
    if (!req.user) {
      return next(new AppError("Access denied. User not authenticated.", 401));
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return next(new AppError("user not found.", 404));
    }

    if (!user.isVerified) {
      return next(
        new AppError("Email not verified. Please verify your email first.", 400)
      );
    }

    // Check if phone number already exists
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      return next(
        new AppError("user with this phone number already exists.", 400)
      );
    }

    // Store previous file URLs to delete from S3
    const filesToDelete = [];

    // Function to compare and delete previous files not included in the current update
    const deleteFilesIfRequired = (existingFileUrl, newFile) => {
      if (
        existingFileUrl &&
        existingFileUrl !== newFile &&
        existingFileUrl !== process.env.DEFAULT_AVATAR_URL
      ) {
        const fileName = existingFileUrl.split("/").pop(); // Extract file name from URL
        if (existingFileUrl.includes("avatars")) {
          filesToDelete.push({ Key: `avatars/${fileName}` });
        } else {
          console.log(`Unknown file path: ${existingFileUrl}`);
        }
      }
    };

    // Compare and delete files if required
    if (req.files?.avatar?.[0]) {
      deleteFilesIfRequired(user.avatar, req.files.avatar[0].location);
    }

    // Update user information
    user.firstName = firstName;
    user.lastName = lastName;
    user.phoneNumber = phoneNumber;
    user.termsAndConditions = termsAndConditions;

    // Handle avatar upload
    if (req.files?.avatar) {
      const avatarUrl = await uploadFileToS3(req.files.avatar[0], "avatars");
      user.avatar = avatarUrl;
    } else if (!user.avatar) {
      user.avatar = process.env.DEFAULT_AVATAR_URL;
    }

    // Process addresses
    if (addresses && Array.isArray(addresses)) {
      user.addresses = await Promise.all(
        addresses.map(async (address) => {
          let coordinates;
          if (address.currentLocation) {
            coordinates = address.currentLocation;
          } else {
            const addressString = `${address.addressLine1}, ${address.addressLine2 || ""}, ${address.city}, ${address.state}, ${address.country}, ${address.pincode}`;
            console.log("Fetching coordinates for address:", addressString);
            try {
              coordinates = await getCoordinatesFromAddress(addressString);
              console.log(
                "Coordinates:",
                coordinates[1] + " , " + coordinates[0]
              );
            } catch (error) {
              console.error(
                `Error fetching coordinates for address: ${addressString}`,
                error.message
              );
              coordinates = [0, 0]; // Default to [0, 0] if an error occurs
            }
          }

          return {
            type: address.type,
            alias: address.alias,
            addressLine1: address.addressLine1,
            addressLine2: address.addressLine2,
            city: address.city,
            state: address.state,
            country: address.country,
            pincode: address.pincode,
            location: {
              type: "Point",
              coordinates,
            },
          };
        })
      );
    }

    // Save user profile
    await user.save({ validateBeforeSave: false });

    // Delete files from S3 that are no longer needed
    if (filesToDelete.length > 0) {
      await deleteUnusedFilesFromS3(filesToDelete);
    }

    // Send successful response
    res.status(200).json({
      status: "success",
      message: "Profile completed successfully.",
      data: {
        user,
      },
    });
  } catch (error) {
    // Log and handle unexpected errors
    console.error("Error completing profile:", error);
    if (!res.headersSent) {
      return next(new AppError("An unexpected error occurred.", 500));
    }
  }
});

exports.completeProfileVendor = catchAsync(async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      companyName,
      phoneNumber,
      addresses,
      additionalRemarks,
      termsAndConditions,
    } = req.body;

    // Check if terms and conditions are accepted
    if (!termsAndConditions) {
      return next(
        new AppError("You must accept the terms and conditions.", 400)
      );
    }

    // Ensure user is logged in and verified
    if (!req.user) {
      return next(new AppError("Access denied. User not authenticated.", 401));
    }

    const vendor = await Vendor.findById(req.user._id);

    if (!vendor) {
      return next(new AppError("Vendor not found.", 404));
    }

    if (!vendor.isVerified) {
      return next(
        new AppError("Email not verified. Please verify your email first.", 400)
      );
    }

    // Check if phone number already exists
    const existingVendor = await Vendor.findOne({ phoneNumber });
    if (
      existingVendor &&
      existingVendor._id.toString() !== vendor._id.toString()
    ) {
      return next(
        new AppError("Vendor with this phone number already exists.", 400)
      );
    }

    // Store previous file URLs to delete from S3
    const filesToDelete = [];

    // Function to compare and delete previous files not included in the current update
    const deleteFilesIfRequired = (existingFileUrl, newFile) => {
      if (
        existingFileUrl &&
        existingFileUrl !== newFile &&
        existingFileUrl !== process.env.DEFAULT_AVATAR_URL
      ) {
        const fileName = existingFileUrl.split("/").pop(); // Extract file name from URL

        if (existingFileUrl.includes("vendor-files")) {
          filesToDelete.push({ Key: `vendor-files/${fileName}` });
        } else if (existingFileUrl.includes("avatars")) {
          filesToDelete.push({ Key: `avatars/${fileName}` });
        } else {
          console.log(`Unknown file path: ${existingFileUrl}`);
        }
      }
    };

    // Compare and delete files if required
    if (req.files?.avatar?.[0]) {
      deleteFilesIfRequired(vendor.avatar, req.files.avatar[0].location);
    }
    if (req.files?.proofOfOwnership?.[0]) {
      deleteFilesIfRequired(
        vendor.proofOfOwnership,
        req.files.proofOfOwnership[0].location
      );
    }
    if (req.files?.insuranceCertificate?.[0]) {
      deleteFilesIfRequired(
        vendor.insuranceCertificate,
        req.files.insuranceCertificate[0].location
      );
    }
    if (req.files?.complianceDocuments?.[0]) {
      deleteFilesIfRequired(
        vendor.complianceDocuments,
        req.files.complianceDocuments[0].location
      );
    }

    // Update vendor information
    vendor.firstName = firstName;
    vendor.lastName = lastName;
    vendor.companyName = companyName;
    vendor.phoneNumber = phoneNumber;
    vendor.additionalRemarks = additionalRemarks;
    vendor.termsAndConditions = termsAndConditions;

    // Handle avatar upload
    if (req.files?.avatar) {
      const avatarUrl = await uploadFileToS3(req.files.avatar[0], "avatars");
      vendor.avatar = avatarUrl;
    } else if (!vendor.avatar) {
      vendor.avatar = process.env.DEFAULT_AVATAR_URL;
    }

    // Handle file uploads (proofOfOwnership, insuranceCertificate, complianceDocuments)
    const handleFileUpload = async (file, fieldName) => {
      if (req.files?.[file]) {
        const fileUrl = await uploadFileToS3(
          req.files[file][0],
          "vendor-files"
        );
        vendor[fieldName] = fileUrl;
      }
    };

    await Promise.all([
      handleFileUpload("proofOfOwnership", "proofOfOwnership"),
      handleFileUpload("insuranceCertificate", "insuranceCertificate"),
      handleFileUpload("complianceDocuments", "complianceDocuments"),
    ]);

    // Process addresses
    if (addresses && Array.isArray(addresses)) {
      vendor.addresses = await Promise.all(
        addresses.map(async (address) => {
          let coordinates;
          if (address.currentLocation) {
            coordinates = address.currentLocation;
          } else {
            const addressString = `${address.addressLine1}, ${address.addressLine2 || ""}, ${address.city}, ${address.state}, ${address.country}, ${address.pincode}`;
            console.log("Fetching coordinates for address:", addressString);
            try {
              coordinates = await getCoordinatesFromAddress(addressString);
              console.log(
                "Coordinates:",
                coordinates[1] + " , " + coordinates[0]
              );
            } catch (error) {
              console.error(
                `Error fetching coordinates for address: ${addressString}`,
                error.message
              );
              coordinates = [0, 0]; // Default to [0, 0] if an error occurs
            }
          }

          return {
            type: address.type,
            alias: address.alias,
            addressLine1: address.addressLine1,
            addressLine2: address.addressLine2,
            city: address.city,
            state: address.state,
            country: address.country,
            pincode: address.pincode,
            location: {
              type: "Point",
              coordinates,
            },
          };
        })
      );
    }

    // Save vendor profile
    await vendor.save({ validateBeforeSave: false });

    // Delete files from S3 that are no longer needed
    if (filesToDelete.length > 0) {
      await deleteUnusedFilesFromS3(filesToDelete);
    }

    // Send successful response
    res.status(200).json({
      status: "success",
      message: "Profile completed successfully.",
      data: {
        vendor,
      },
    });
  } catch (error) {
    // Log and handle unexpected errors
    console.error("Error completing profile:", error);
    if (!res.headersSent) {
      return next(new AppError("An unexpected error occurred.", 500));
    }
  }
});

exports.updateProfilePic = catchAsync(async (req, res, next) => {
  // Ensure avatar file is uploaded
  if (!req.file || !req.file.buffer) {
    return next(new AppError("Avatar file is required.", 400));
  }

  let Model;
  if (req.user.role === "vendor") {
    Model = Vendor;
  } else if (req.user.role === "user") {
    Model = User;
  } else {
    return next(new AppError("Unknown user role.", 403));
  }

  try {
    // Find user/vendor by ID
    const profile = await Model.findById(req.user._id);

    if (!profile) {
      return next(new AppError(`${Model.modelName} not found.`, 404));
    }

    // Delete old avatar from S3 and database if it exists
    if (profile.avatar) {
      const avatarKey = profile.avatar.split("/").pop(); // Extracts the file key from the URL
      const filesToDelete = [{ Key: `avatars/${req.user._id}/${avatarKey}` }];

      // Delete from S3
      await deleteUnusedFilesFromS3(filesToDelete);

      // Delete from database
      profile.avatar = undefined;
      await profile.save({ validateBeforeSave: false });
    }

    // Upload new avatar to S3
    const avatarUrl = await uploadFileToS3(req.file, "avatars");

    // Update profile's avatar URL in the database
    profile.avatar = avatarUrl;
    await profile.save({ validateBeforeSave: false });

    res.status(200).json({
      status: "success",
      message: "Profile picture updated successfully.",
      data: {
        avatar: profile.avatar,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Send OTP to mobile for otp login
// Step 1: Send OTP to the provided mobile number (with existence check)
exports.sendOTPToMobile = catchAsync(async (req, res, next) => {
  const { phoneNumber } = req.body;

  try {
    // Check if a user or vendor with the provided phoneNumber exists
    let currentUser = await User.findOne({ phoneNumber });

    if (!currentUser) {
      currentUser = await Vendor.findOne({ phoneNumber });
    }

    if (!currentUser) {
      // If user/vendor doesn't exist, handle the scenario (e.g., return an error)
      return next(new AppError("User not found.", 404));
    }

    // Generate OTP (verification code) and send it to the provided phone number
    const otp = Math.floor(100000 + Math.random() * 900000); // Generate a random 6-digit OTP
    await admin.auth().sendVerificationCode(phoneNumber, otp);

    res.status(200).json({
      status: "success",
      message: "OTP sent successfully to the provided phone number.",
      otp: otp, // Sending OTP back to client for verification (for testing purposes; handle securely in production)
    });
  } catch (error) {
    return next(new AppError("Failed to send OTP.", 500));
  }
});

// Function to verify OTP and login
exports.verifyOTPAndLogin = catchAsync(async (req, res, next) => {
  const { phoneNumber, otp } = req.body;

  try {
    // Verify the OTP entered by the user
    const phoneAuthCredential = admin
      .auth()
      .PhoneAuthProvider.credential(phoneNumber, otp);
    const userRecord = await admin.auth().verifyIdToken(phoneAuthCredential);

    if (!userRecord) {
      return next(new AppError("Invalid OTP entered.", 401));
    }

    // Check if the user or vendor exists in your database
    let currentUser = await User.findOne({ phoneNumber });

    if (!currentUser) {
      currentUser = await Vendor.findOne({ phoneNumber });
    }

    if (!currentUser) {
      // Create a new user or vendor account if it doesn't exist
      // Example: currentUser = await User.create({ phoneNumber });
      // Or handle as needed based on your application's logic
      return next(new AppError("User not found.", 404));
    }

    // Proceed with login or token generation
    createSendToken(currentUser, 200, res);
  } catch (error) {
    // Handle OTP verification failure
    return next(new AppError("OTP verification failed.", 401));
  }
});

// LOGIN
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Find user or vendor by email
  const user = await User.findOne({ email }).select(
    "+password +accountDeletionRequested +accountDeletionExpires"
  );
  const vendor = await Vendor.findOne({ email }).select(
    "+password +accountDeletionRequested +accountDeletionExpires"
  );
  const currentUser = user || vendor;

  // 2) Validate password and existence of user/vendor
  if (
    !currentUser ||
    !(await currentUser.correctPassword(password, currentUser.password))
  ) {
    return next(new AppError("Incorrect email or password", 401));
  }

  // 3) Check email verification status
  if (!currentUser.isVerified) {
    return next(
      new AppError(
        "Your email is not verified. Please verify your email first.",
        401
      )
    );
  }

  // 4) Check if the user/vendor requested account deletion
  if (currentUser.accountDeletionRequested) {
    if (Date.now() > currentUser.accountDeletionExpires) {
      // Account deletion period expired; delete account
      if (user) {
        await User.deleteOne({ _id: currentUser._id });
      } else if (vendor) {
        await Vendor.deleteOne({ _id: currentUser._id });
      }
      return next(new AppError("Your account has been deleted.", 401));
    } else {
      // Deactivate account deletion request
      currentUser.accountDeletionRequested = false;
      currentUser.accountDeletionExpires = undefined;
      await currentUser.save({ validateBeforeSave: false });
    }
  }

  // 5) If everything is okay, send the token
  createSendToken(currentUser, 200, res);
});

exports.logout = (req, res) => {
  // Clear the JWT cookie
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000), // Set a short expiration time
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Use secure flag in production
    sameSite: "Strict", // Ensure the cookie is sent in the same site context
  });
  console.log("Logout - JWT cookie set:", req.cookies.jwt);

  // Send response to indicate successful logout
  res.status(200).json({
    status: "success",
    message: "Logged out successfully",
  });
};

// FORGOT PASSWORD
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  const vendor = await Vendor.findOne({ email: req.body.email });

  if (!user && !vendor) {
    return next(new AppError("There is no user with this email", 404));
  }

  let resetToken;
  let resetURL;
  let message;
  if (user) {
    resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });
    resetURL = `${req.protocol}://${req.get("host")}/api/v1/auth/user/resetpassword/${resetToken}`;
    message = `<p>Hi ${user.userName},</p>
      <p>Forgot your password? Please click on the link below to reset your password:</p>
      <a href="${resetURL}">Click here to reset your password</a>
      <p>If you didn't forget your password, please ignore this email.</p>
      <p>This is an auto-generated email sent by the system.</p>
    `;
  } else if (vendor) {
    resetToken = vendor.createPasswordResetToken();
    await vendor.save({ validateBeforeSave: false });
    resetURL = `${req.protocol}://${req.get("host")}/api/v1/auth/vendor/resetpassword/${resetToken}`;
    message = `<p>Hi ${vendor.vendor_name},</p>
      <p>Forgot your password? Please click on the link below to reset your password:</p>
      <a href="${resetURL}">Click here to reset your password</a>
      <p>If you didn't forget your password, please ignore this email.</p>
      <p>This is an auto-generated email sent by the system.</p>
    `;
  }

  try {
    await sendEmail({
      email: user ? user.email : vendor.email,
      subject: "Your password reset token (valid for 10 min)",
      message,
    });
    res.status(200).json({
      status: "success",
      message: "Token sent to email",
    });
  } catch (err) {
    console.error("Error sending email:", err); // Log the specific error

    if (user) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
    } else if (vendor) {
      vendor.passwordResetToken = undefined;
      vendor.passwordResetExpires = undefined;
      await vendor.save({ validateBeforeSave: false });
    }

    return next(
      new AppError("There was an error sending the email. Try again later", 500)
    );
  }
});

// UPDATE CURRENT USER DATA
exports.updateMe = async (req, res, next) => {
  //create error if user posts password data
  if (req.body.password || req.body.passwordConfirm)
    return next(
      new AppError(
        "This route is not for password updates. Please use /updateMyPassword",
        400
      )
    );

  const filteredBody =
    req.user.role === "vendor"
      ? filterObj(
          req.body,
          "vendor_name",
          "email",
          "phoneNumber",
          "photo",
          "addresses"
        )
      : filterObj(
          req.body,
          "userName",
          "email",
          "phoneNumber",
          "photo",
          "addresses"
        );

  let updatedUser;
  if (req.user.role === "vendor") {
    updatedUser = await Vendor.findByIdAndUpdate(req.user.id, filteredBody, {
      new: true,
      runValidators: true,
    });
  } else {
    updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
      new: true,
      runValidators: true,
    });
  }

  res.status(200).json({
    status: "success",
    requestedAt: req.requestTime,
    data: {
      updatedUser,
    },
  });
};

//RESET PASSWORD
exports.resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  const vendor = await Vendor.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user && !vendor) {
    return next(new AppError("Token is invalid or has expired", 400));
  }
  let currentUser;
  if (user) {
    currentUser = user;
  } else if (vendor) {
    currentUser = vendor;
  }
  // Check if the new password matches any of the previous passwords
  if (currentUser.passwordHistory) {
    const passwordMatches = await Promise.all(
      currentUser.passwordHistory.map(async (oldPassword) => {
        return await currentUser.correctPassword(
          req.body.password,
          oldPassword
        );
      })
    );

    if (passwordMatches.some((match) => match)) {
      return next(
        new AppError("You cannot use a password that you have used before", 400)
      );
    }
  }

  currentUser.password = req.body.password;
  currentUser.passwordConfirm = req.body.passwordConfirm;
  currentUser.passwordResetToken = undefined;
  currentUser.passwordResetExpires = undefined;
  if (currentUser.password != currentUser.passwordConfirm) {
    return next(
      new AppError("Password and confirm password doesn't match", 400)
    );
  }
  await currentUser.save();
  createSendToken(currentUser, 200, res);
});

// UPDATE PASSWORD FOR CURRENT LOGGED ONE
exports.updatePassword = catchAsync(async (req, res, next) => {
  // Find user or vendor by ID and include password and passwordHistory fields
  const user = await User.findById(req.user.id).select(
    "+password +passwordHistory"
  );
  const vendor = await Vendor.findById(req.user.id).select(
    "+password +passwordHistory"
  );

  // Check if user or vendor exists and if the current password is correct
  const currentUser = user || vendor;
  if (
    !currentUser ||
    !(await currentUser.correctPassword(
      req.body.passwordCurrent,
      currentUser.password
    ))
  ) {
    return next(new AppError("Your current password is incorrect", 401));
  }

  // Check if the new password has been used before
  if (currentUser.passwordHistory) {
    for (const oldPassword of currentUser.passwordHistory) {
      if (await currentUser.correctPassword(req.body.password, oldPassword)) {
        return next(
          new AppError(
            "You have already used this password. Please choose a new password.",
            400
          )
        );
      }
    }
  }

  // Update the password and save
  currentUser.password = req.body.password;
  currentUser.passwordConfirm = req.body.passwordConfirm;
  await currentUser.save();

  // Send response
  createSendToken(currentUser, 200, res);
});

// REQUEST FOR ACCOUNT DELETION
exports.requestAccountDeletion = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  const vendor = await Vendor.findById(req.user.id);

  let currentUser = user || vendor;
  if (!currentUser) {
    return next(new AppError("User not found", 404));
  }
  if (currentUser.accountDeletionRequested) {
    return next(
      new AppError(
        `Account deletion already requested. Your account will be deleted if you don't login before the expiration date:${currentUser.accountDeletionExpires}.`,
        400
      )
    );
  }

  currentUser.active = false;
  currentUser.accountDeletionRequested = true;
  currentUser.accountDeletionExpires = Date.now() + 2 * 60 * 1000; // 2min
  // currentUser.accountDeletionExpires = Date.now() + 90 * 24 * 60 * 60 * 1000; //90 days

  await currentUser.save({ validateBeforeSave: false });

  res.status(200).json({
    status: "success",
    message: `Account deletion requested. The account will be permanently deleted after ${currentUser.accountDeletionExpires} days if not reactivated.`,
  });
});
exports.approveVendor = catchAsync(async (req, res, next) => {
  const { vendorId } = req.params;

  const vendor = await Vendor.findByIdAndUpdate(
    vendorId,
    {
      isApproved: true,
    },
    { new: true, runValidators: true }
  );

  if (!vendor) {
    return next(new AppError("Vendor not found.", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Vendor approved successfully.",
    vendor,
  });
});
// PROTECT
exports.protect = catchAsync(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  // Debugging statement
  console.log("Protect Middleware - JWT cookie value:", token);

  if (!token || token === "loggedout") {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  try {
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    let currentUser;
    if (decoded.role === "vendor") {
      currentUser = await Vendor.findById(decoded.id);
    } else {
      currentUser = await User.findById(decoded.id);
    }

    if (!currentUser) {
      return next(
        new AppError(
          "The user belonging to this token does no longer exist.",
          401
        )
      );
    }

    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return next(
        new AppError(
          "User recently changed password! Please log in again.",
          401
        )
      );
    }

    req.user = currentUser;
    res.locals.user = currentUser;
    next();
  } catch (err) {
    console.error("Error in protect middleware:", err);
    return next(new AppError("Invalid token. Please log in again.", 401));
  }
});
// RESTRICT TO
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }
    next();
  };
};
