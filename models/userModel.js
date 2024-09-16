const crypto = require("crypto");
const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const userSchema = mongoose.Schema(
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
    email: {
      type: String,
      required: [true, "Please tell us your email"],
      unique: true,
      lowercase: true,
      validate: [
        {
          validator: validator.isEmail,
          message: "Please provide a valid email",
        },
      ],
    },
    password: {
      type: String,
      required: [true, "please provide a password"],
      minlength: [8, "A password must have more or equal to 8 characters"],
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, "please confirm your password"],
      validate: {
        validator: function (el) {
          return el === this.password;
        },
        message: "passwords are not the same",
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
          required: true,
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
    avatar: {
      type: String, // URL or path to the uploaded file
      required: [true, "Please upload your photograph"],
    },
    role: {
      type: String,
      default: "user",
    },
    subscription_status: {
      type: String,
      enum: ["active", "inactive"],
      default: "inactive",
    },
    isVerified: { type: Boolean, default: false },
    termsAndConditions: {
      type: Boolean,
      required: [true, "You must accept the terms and conditions"],
    },
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
    passwordHistory: { type: [String], select: false }, // Array to store hashed previous passwords
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
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product", // Reference to the Product model
      },
    ],
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
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

userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre("find", function (next) {
  //this points to current query
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
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
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};
userSchema.methods.createEmailConfirmToken = function () {
  const confirmToken = crypto.randomBytes(32).toString("hex");
  this.emailConfirmToken = crypto
    .createHash("sha256")
    .update(confirmToken)
    .digest("hex");
  this.emailConfirmExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return confirmToken;
};

const User = mongoose.model("User", userSchema);
module.exports = User;
