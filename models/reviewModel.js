const mongoose = require("mongoose");
const validator = require("validator");

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, "Review cannot be empty"],
      trim: true,
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be above 0"],
      max: [5, "Rating must be below or equal to 5"],
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Review must belong to a product"],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Review must belong to a user"],
    },
    vendorResponse: {
      response: {
        type: String,
        trim: true,
      },
      respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
      },
      respondedAt: {
        type: Date,
      },
      responseUpdatedAt: {
        type: Date,
      },
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
  { timestamps: true }
);

reviewSchema.index({ product: 1, user: 1 }, { unique: true, dropDup: true });

reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: "user",
    select: "firstName avatar",
  });
  // Conditionally populate 'vendorResponse.respondedBy' if 'vendorResponse' exists
  this.populate({
    path: "vendorResponse.respondedBy",
    select: "firstName avatar",
  });
  next();
});
// Calculate average rating and review count
reviewSchema.statics.calculateAverageRatings = async function (productId) {
  const stats = await this.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: "$product",
        averageRating: { $avg: "$rating" },
        ratingQuantity: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await this.model("Product").findByIdAndUpdate(productId, {
      ratingsAverage: stats[0].averageRating,
      ratingsQuantity: stats[0].ratingQuantity,
    });
  } else {
    await this.model("Product").findByIdAndUpdate(productId, {
      ratingsAverage: 4.5,
      ratingsQuantity: 0,
    });
  }
};

reviewSchema.post("save", function () {
  //this points to current review
  this.constructor.calculateAverageRatings(this.product);
});

//findByIdAndUpdate
//findByIdAndDelete
reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.clone().findOne();
  console.log(this.r);
  next();
});
reviewSchema.post(/^findOneAnd/, async function () {
  await this.r.constructor.calculateAverageRatings(this.r.product);
});

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
