const mongoose = require("mongoose");
const slugify = require("slugify");
const validator = require("validator");

const productSchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      default: null,
    },

    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subcategory",
      required: true,
      default: null,
    },
    machineryId: {
      type: String,
      required: [true, "A product must have a machinery ID"],
      unique: true,
    },
    modelName: {
      type: String,
      required: [true, "A product must have a model name"],
    },
    slug: String,
    manufactureYear: {
      type: Number,
      required: [true, "A product must have a manufacture year"],
    },
    condition: {
      type: String,
      required: [true, "A product must have a condition"],
      enum: ["new", "used", "refurbished"],
    },
    additionalAttachments: [
      {
        type: String,
      },
    ],
    availability: {
      from: {
        type: Date,
        required: [true, "Availability start date is required"],
      },
      to: {
        type: Date,
        required: [true, "Availability end date is required"],
      },
    },
    productImages: [
      {
        type: String,
        required: true,
      },
    ],
    priceTypes: [
      {
        type: {
          type: String,
          required: [true, "A price type is required"],
          enum: ["hourly", "daily", "weekly", "monthly", "fixed"],
        },
        price: {
          type: Number,
          required: [true, "A price is required for the price type"],
        },
      },
    ],
    additionalServices: [
      {
        serviceType: {
          type: String, // Specify the type here
          required: [true, "A service type is required"],
          enum: ["driver", "delivery", "pickup"], // Enum validation if needed
        },
        charges: {
          type: Number, // Specify the type here
          required: [true, "Charges required for the service type"],
          default: function () {
            return this.serviceType === "pickup" ? 0 : undefined; // Set charges to 0 for "pickup", undefined for others
          },
        },
      },
    ],
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, "Rating must be above 1.0"],
      max: [5, "Rating must be below 5.0"],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    approved: {
      type: Boolean,
      default: false,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: "2dsphere", // Ensure this index is set for geospatial queries
        required: [true, "Coordinates are required for location."],
      },
    },
    quantity: {
      type: Number,
      required: [true, "A product must have a quantity."],
      defalut: 1,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
  { timestamps: true }
);

productSchema.virtual("reviews", {
  ref: "Review",
  foreignField: "product",
  localField: "_id",
});

productSchema.pre("save", function (next) {
  // Ensure that productName or modelName (or another appropriate field) is populated
  if (this.modelName) {
    this.slug = slugify(this.modelName, { lower: true });
  }
  next();
});
productSchema.pre(/^find/, function (next) {
  this.populate({
    path: "reviews",
  });

  this.populate({
    path: "vendor",
    select: "_id companyName",
  });
  // Conditionally populate 'vendorResponse.respondedBy' if 'vendorResponse' exists
  this.populate({
    path: "category",
    select: "category_name",
  });
  this.populate({
    path: "subcategory",
    select: "subCategory_name",
  });
  next();
});
productSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start} milliseconds`);
  // console.log(docs);
  next();
});
const Product = mongoose.model("Product", productSchema);

module.exports = Product;
