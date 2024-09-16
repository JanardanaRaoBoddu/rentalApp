const Review = require("./../models/reviewModel");
const mongoose = require("mongoose");
const factory = require("./handlerFactory");
const AppError = require("./../utils/appError");
const catchAsync = require("./../utils/catchAsync");
const Product = require("./../models/productModel");
const User = require("./../models/userModel");

// Middleware to check if user or admin can create a review
const checkUserPermissions = async (req, Model) => {
  let doc;

  if (!req.body.product) {
    req.body.product = req.params.productId;
  }
  const productId = req.body.product;

  console.log("Product ID from request body or params:", productId);
  console.log("User ID from request body:", req.body.userId);

  if (req.user.role === "admin") {
    if (req.body.userId) {
      console.log("Admin checking document for userId:", req.body.userId);
      doc = await Model.findOne({ _id: productId, user: req.body.userId });
    } else {
      console.log("Admin fetching document by ID:", productId);
      doc = await Model.findById(productId);
    }
  } else {
    console.log("Regular user checking document with user ID:", req.user.id);
    doc = await Model.findOne({ _id: productId, user: req.user.id });
  }

  if (!doc) {
    console.log("No document found with ID:", productId);
    throw new AppError("No document found with that ID", 404);
  }

  return doc;
};

exports.setProductUserIds = (req, res, next) => {
  // console.log("req.user:", req.user); // Debug line to check req.user

  if (!req.body.product && !req.params.productId) {
    return next(new AppError("Product ID is required", 400));
  }

  if (!req.body.product) req.body.product = req.params.productId;

  if (!req.body.user && !req.user) {
    return next(new AppError("User ID is required", 400));
  }

  if (!req.body.user) req.body.user = req.user.id;

  if (!req.body.vendor && !req.user) {
    return next(new AppError("Vendor ID is required", 400));
  }

  if (!req.body.vendor) req.body.vendor = req.user.id;

  next();
};

exports.createReview = catchAsync(async (req, res, next) => {
  // Destructure user, params, and body from the request object
  const { user, params, body, query } = req;
  const { role } = user;
  const { productId } = params;
  const { userId: specifiedUserId } = query;

  // Check if product ID is provided
  if (!productId) {
    return next(new AppError("Product ID is required", 400));
  }

  // Verify the product existence
  const product = await Product.findById(productId);
  if (!product) {
    return next(new AppError("No product found with that ID", 404));
  }

  // Determine the ID of the user creating the review
  let creatingUserId = user._id;

  // Admin role checks
  if (role === "admin") {
    if (specifiedUserId) {
      const userExists = await User.findById(specifiedUserId);
      if (!userExists) {
        return next(new AppError("Specified user not found", 404));
      }
      creatingUserId = specifiedUserId; // Set creatingUserId to the specified user ID
    }
  }

  // Set the user ID and product ID in the request body
  req.body.user = creatingUserId;
  req.body.product = productId;

  // Create the review with the provided data
  const newReview = await Review.create(req.body);

  res.status(201).json({
    status: "success",
    data: {
      review: newReview,
    },
  });
});

// Get all reviews
exports.getAllReviews = factory.getAll(Review);

// Get a single review
exports.getReview = factory.getOne(Review);

// Update a review
exports.updateReview = factory.updateOne(Review);

// Delete a review
exports.deleteReview = factory.deleteOne(Review);

// Reviews of logged in user
exports.getUserReviews = catchAsync(async (req, res, next) => {
  // Destructure user and query from the request object
  const { user, query } = req;
  const { role, _id: loggedInUserId } = user;
  const { userId: specifiedUserId } = query;

  // Determine which user ID to use based on role and query parameters
  const userId =
    role === "admin" && specifiedUserId ? specifiedUserId : loggedInUserId;

  const reviews = await Review.find({ user: userId });

  if (!reviews.length) {
    return next(new AppError("No reviews found for this user", 404));
  }

  res.status(200).json({
    status: "success",
    results: reviews.length,
    data: {
      reviews,
    },
  });
});

// Get a single logged in user review
exports.getUserReview = catchAsync(async (req, res, next) => {
  // Destructure user and params from the request object
  const { user, params } = req;
  const { role, _id: loggedInUserId } = user;
  const { id: reviewId } = params;
  const { userId: specifiedUserId } = req.query; // Optional query parameter for admin

  // Determine which user ID to use based on role and query parameters
  const userId =
    role === "admin" && specifiedUserId ? specifiedUserId : loggedInUserId;

  // Find the review by ID
  const review = await Review.findById(reviewId).populate({
    path: "product",
    select: "modelName productImages[0]",
  });

  if (!review) {
    return next(new AppError("No review found with that ID", 404));
  }

  // Check if the logged-in user is allowed to access the review
  if (review.user.toString() !== userId.toString() && role !== "admin") {
    return next(
      new AppError("You do not have permission to view this review", 403)
    );
  }

  res.status(200).json({
    status: "success",
    data: {
      review,
    },
  });
});

// Update a logged in user review
exports.updateUserReview = catchAsync(async (req, res, next) => {
  // Destructure user, params, and body from the request object
  const { user, params, body } = req;
  const { role, _id: loggedInUserId } = user;
  const { id: reviewId } = params;
  const { userId: specifiedUserId } = req.query; // Optional query parameter for admin

  // Determine which user ID to use based on role and query parameters
  const userId =
    role === "admin" && specifiedUserId ? specifiedUserId : loggedInUserId;

  // Find the review by ID
  const review = await Review.findById(reviewId);

  if (!review) {
    return next(new AppError("No review found with that ID", 404));
  }
  // // Debugging output to help identify the issue
  // console.log("Review user ID:", review.user._id.toString());
  // console.log("Logged-in user ID:", userId.toString());

  // Check if the logged-in user is allowed to update the review
  if (review.user._id.toString() !== userId.toString()) {
    return next(
      new AppError("You do not have permission to update this review", 403)
    );
  }

  // Update the review with new data from the request body
  const updatedReview = await Review.findByIdAndUpdate(
    reviewId,
    { ...body }, // Spread the body to update fields
    { new: true, runValidators: true }
  );

  res.status(200).json({
    status: "success",
    data: {
      review: updatedReview,
    },
  });
});

// Delete a logged in user review
exports.deleteUserReview = catchAsync(async (req, res, next) => {
  // Destructure user and params from the request object
  const { user, params } = req;
  const { role, _id: loggedInUserId } = user;
  const { id: reviewId } = params;
  const { userId: specifiedUserId } = req.query; // Optional query parameter for admin

  // Determine which user ID to use based on role and query parameters
  const userId =
    role === "admin" && specifiedUserId ? specifiedUserId : loggedInUserId;

  // Find the review by ID
  const review = await Review.findById(reviewId);

  if (!review) {
    return next(new AppError("No review found with that ID", 404));
  }

  // Check if the logged-in user is allowed to delete the review
  if (review.user._id.toString() !== userId.toString()) {
    return next(
      new AppError("You do not have permission to delete this review", 403)
    );
  }

  // Delete the review
  await Review.findByIdAndDelete(reviewId);

  res.status(204).json({
    status: "success",
    data: null,
  });
});

// Get all responses of a vendor
exports.getVendorResponses = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { role, _id: vendorId } = user;

  // Only allow vendors and admins to access this route
  if (role !== "vendor" && role !== "admin") {
    return next(
      new AppError(
        "Access denied. Only vendors and admins can view responses.",
        403
      )
    );
  }

  let reviews;

  if (role === "vendor") {
    // Fetch all reviews where the logged-in vendor has responded
    reviews = await Review.find({
      "vendorResponse.respondedBy": vendorId,
    })
      .populate({
        path: "product",
        select: "modelName productImages", // Only select modelName and productImages fields
      })
      .populate({
        path: "user", // Populate the user who gave the review
        select: "firstName avatar", // Adjust fields as necessary
      })
      .populate({
        path: "vendorResponse.respondedBy",
        select: "firstName avatar", // Ensure these fields exist in the Vendor model
      });

    // Process the reviews to include only one image from productImages
    reviews = reviews.map((review) => {
      if (review.product && review.product.productImages.length > 0) {
        // Include only the first image
        review.product.productImages = [review.product.productImages[0]];
      }
      return review;
    });

    if (!reviews || reviews.length === 0) {
      return next(new AppError("No responses found for this vendor.", 404));
    }
  } else if (role === "admin") {
    // Admin can get all responses of a specified vendor
    const { vendorId: specifiedVendorId } = req.query;

    // Validate that the vendorId is provided and is a valid ObjectId
    if (!specifiedVendorId) {
      return next(new AppError("Vendor ID is required.", 400));
    }

    if (!mongoose.Types.ObjectId.isValid(specifiedVendorId)) {
      return next(new AppError("Invalid Vendor ID format.", 400));
    }

    // Fetch all reviews where the specified vendor has responded
    reviews = await Review.find({
      "vendorResponse.respondedBy": specifiedVendorId,
    })
      .populate({
        path: "product",
        select: "modelName productImages", // Only select modelName and productImages fields
      })
      .populate({
        path: "user",
        select: "firstName avatar", // Ensure these fields exist in the User model
      })
      .populate({
        path: "vendorResponse.respondedBy",
        select: "firstName avatar", // Ensure these fields exist in the Vendor model
      });

    // Process the reviews to include only one image from productImages
    reviews = reviews.map((review) => {
      if (review.product && review.product.productImages.length > 0) {
        // Include only the first image
        review.product.productImages = [review.product.productImages[0]];
      }
      return review;
    });

    if (!reviews || reviews.length === 0) {
      return next(
        new AppError("No responses found for the specified vendor.", 404)
      );
    }
  }

  res.status(200).json({
    status: "success",
    results: reviews.length,
    data: {
      reviews,
    },
  });
});
// Respond to a review
exports.respondToReview = catchAsync(async (req, res, next) => {
  // Destructure user, params, and body from the request object
  const { user, params, body, query } = req;
  const { role } = user;
  const { id: reviewId } = params;
  const { vendorId: specifiedVendorId } = query;

  // Fetch the review directly
  const review = await Review.findById(reviewId);

  if (!review) {
    return next(new AppError("No review found with that ID", 404));
  }

  // Determine the ID of the user responding
  let respondingUserId = user._id;

  // Admin role checks
  if (role === "admin") {
    if (specifiedVendorId) {
      const product = await Product.findById(review.product);
      if (!product) {
        return next(
          new AppError("Product associated with the review not found", 404)
        );
      }

      if (product.vendor._id.toString() !== specifiedVendorId) {
        return next(
          new AppError(
            "Product is not associated with the specified vendor",
            403
          )
        );
      }

      respondingUserId = specifiedVendorId; // Set respondingUserId to the specified vendor ID
    }
  }

  // Vendor role checks
  if (role === "vendor") {
    const product = await Product.findById(review.product);
    if (!product) {
      return next(
        new AppError("Product associated with the review not found", 404)
      );
    }
    if (product.vendor._id.toString() !== respondingUserId.toString()) {
      return next(
        new AppError("Product is not associated with the logged-in vendor", 403)
      );
    }
  }

  // Update the vendor response
  review.vendorResponse = {
    response: body.response,
    respondedBy: respondingUserId,
    respondedAt: Date.now(),
  };

  await review.save();

  res.status(200).json({
    status: "success",
    data: {
      review,
    },
  });
});

// Update vendor response
exports.updateVendorResponse = catchAsync(async (req, res, next) => {
  // Destructure user, params, and body from the request object
  const { user, params, body, query } = req;
  const { role } = user;
  const { id: reviewId } = params;
  const { vendorId: specifiedVendorId } = query;

  // Fetch the review directly
  const review = await Review.findById(reviewId);

  if (!review) {
    return next(new AppError("No review found with that ID", 404));
  }

  // Determine the ID of the user updating the response
  let updatingUserId = user._id;

  // Admin role checks
  if (role === "admin") {
    if (specifiedVendorId) {
      const product = await Product.findById(review.product);
      if (!product) {
        return next(
          new AppError("Product associated with the review not found", 404)
        );
      }

      if (product.vendor._id.toString() !== specifiedVendorId) {
        return next(
          new AppError(
            "Product is not associated with the specified vendor",
            403
          )
        );
      }

      updatingUserId = specifiedVendorId; // Set updatingUserId to the specified vendor ID
    }
  }

  // Vendor role checks
  if (role === "vendor") {
    const product = await Product.findById(review.product);
    if (!product) {
      return next(
        new AppError("Product associated with the review not found", 404)
      );
    }
    if (product.vendor._id.toString() !== updatingUserId.toString()) {
      return next(
        new AppError("Product is not associated with the logged-in vendor", 403)
      );
    }
  }

  // Update the vendor response
  if (!review.vendorResponse) {
    return next(new AppError("No response exists to update", 404));
  }

  review.vendorResponse.response = body.response;
  review.vendorResponse.responseUpdatedAt = Date.now();

  await review.save();

  res.status(200).json({
    status: "success",
    data: {
      review,
    },
  });
});

// Delete vendor response
exports.deleteVendorResponse = catchAsync(async (req, res, next) => {
  // Destructure user, params, and query from the request object
  const { user, params, query } = req;
  const { role } = user;
  const { id: reviewId } = params;
  const { vendorId: specifiedVendorId } = query;

  // Fetch the review directly
  const review = await Review.findById(reviewId);

  if (!review) {
    return next(new AppError("No review found with that ID", 404));
  }

  // Determine the ID of the user deleting the response
  let deletingUserId = user._id;

  // Admin role checks
  if (role === "admin") {
    if (specifiedVendorId) {
      const product = await Product.findById(review.product);
      if (!product) {
        return next(
          new AppError("Product associated with the review not found", 404)
        );
      }

      if (product.vendor._id.toString() !== specifiedVendorId) {
        return next(
          new AppError(
            "Product is not associated with the specified vendor",
            403
          )
        );
      }

      deletingUserId = specifiedVendorId; // Set deletingUserId to the specified vendor ID
    }
  }

  // Vendor role checks
  if (role === "vendor") {
    const product = await Product.findById(review.product);
    if (!product) {
      return next(
        new AppError("Product associated with the review not found", 404)
      );
    }
    if (product.vendor._id.toString() !== deletingUserId.toString()) {
      return next(
        new AppError("Product is not associated with the logged-in vendor", 403)
      );
    }
  }

  // Delete the vendor response
  if (!review.vendorResponse) {
    return next(new AppError("No response exists to delete", 404));
  }

  review.vendorResponse = undefined;

  await review.save();

  res.status(204).json({
    status: "success",
    data: null,
  });
});
