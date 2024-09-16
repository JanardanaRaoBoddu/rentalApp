const crypto = require("crypto");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const validator = require("validator");

const vendorSchema = mongoose.Schema(
  {
    firstName: {
      type: String,
      trim: true,
      required: [true, "Please provide your first name"],
    },
    lastName: {
      type: String,
      trim: true,
      required: [true, "Please provide your last name"],
    },
    companyName: {
      type: String,
      required: [true, "Please provide your company name"],
    },
    email: {
      type: String,
      required: [true, "Please enter your email address"],
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Please enter password"],
      minLength: [8, "A password must have more or equal to 8 characters"],
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, "Please confirm your password"],
      validate: {
        // Only run this validation if password is being modified or set
        validator: function (el) {
          return el === this.password;
        },
        message: "Passwords do not match!",
      },
    },
    phoneNumber: {
      type: String,
      required: [true, "please tell us your mobile number"],
      unique: true,
      sparse: true,
    },
    addresses: [
      {
        type: {
          type: String,
          enum: ["home", "work", "other"], // Define your default address types here
          default: "home", // Default type if not specified
        },
        alias: {
          type: String,
        },
        addressLine1: {
          type: String,
          required: true,
        },
        addressLine2: {
          type: String,
        },
        city: {
          type: String,
          required: true,
        },
        state: {
          type: String,
          required: true,
        },
        country: {
          type: String,
          required: true,
        },
        pincode: {
          type: String,
          required: true,
        },
        location: {
          type: {
            type: String,
            enum: ["Point"], // GeoJSON type
            default: "Point",
          },
          coordinates: {
            type: [Number], // [longitude, latitude]
            index: "2dsphere", // For geospatial queries
            required: true,
          },
        },
      },
    ],
    proofOfOwnership: {
      type: String, // URL or path to the uploaded file
      required: [true, "Please upload proof of ownership"],
    },
    insuranceCertificate: {
      type: String, // URL or path to the uploaded file
      required: [true, "Please upload your insurance certificate"],
    },
    complianceDocuments: {
      type: String, // URL or path to the uploaded file
      required: [true, "Please upload your compliance documents"],
    },
    avatar: {
      type: String, // URL or path to the uploaded file
      required: [true, "Please upload your photograph"],
    },
    additionalRemarks: {
      type: String,
    },
    termsAndConditions: {
      type: Boolean,
      required: [true, "You must accept the terms and conditions"],
    },
    subscription_status: {
      type: String,
      enum: ["active", "inactive"],
      default: "inactive",
    },
    role: { type: String, default: "vendor" },
    isVerified: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },
    emailConfirmToken: String,
    emailConfirmExpires: Date,
    otp: {
      type: String,
      default: null,
    },
    otpExpiresAt: {
      type: Date,
      default: null,
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    passwordHistory: { type: [String] },
    active: {
      type: Boolean,
      default: true,
      select: false,
    },
    accountDeletionRequested: {
      type: Boolean,
      default: false,
    },
    accountDeletionExpires: Date,
  },
  { timestamps: true }
);

vendorSchema.pre("save", async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified("password")) return next();
  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  // If the user is not new, add the old password to the password history
  if (!this.isNew) {
    this.passwordHistory = this.passwordHistory || [];
    this.passwordHistory.push(this.password);

    // Limit password history to the last 10 passwords (or any number you prefer)
    if (this.passwordHistory.length > 10) {
      this.passwordHistory.shift();
    }
  }
  // Delete the passwordConfirm field
  this.passwordConfirm = undefined;
  next();
});
vendorSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) {
    next();
  } else if (!this.passwordConfirm || this.password !== this.passwordConfirm) {
    this.invalidate("passwordConfirm", "Passwords must match.");
    next(new Error("Passwords must match."));
  } else {
    this.passwordConfirm = undefined;
    next();
  }
});

vendorSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// vendorSchema.pre(/^find/, function (next) {
//   //this points to current query
//   this.find({ active: { $ne: false } });
//   next();
// });

vendorSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

vendorSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    // console.log(changedTimestamp, JWTTimestamp);
    return JWTTimestamp < changedTimestamp;
  }
  //false means not changed
  return false;
};

vendorSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};
vendorSchema.methods.createEmailConfirmToken = function () {
  const confirmToken = crypto.randomBytes(32).toString("hex");
  this.emailConfirmToken = crypto
    .createHash("sha256")
    .update(confirmToken)
    .digest("hex");
  this.emailConfirmExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return confirmToken;
};

const Vendor = mongoose.model("Vendor", vendorSchema);
module.exports = Vendor;
