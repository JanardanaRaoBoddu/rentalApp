const express = require("express");
const reviewController = require("./../controllers/reviewController");
const authController = require("./../controllers/auth");

const router = express.Router({ mergeParams: true });
// Middleware to set user and product IDs
// router.use(reviewController.setProductUserIds);

// Routes for all reviews
router
  .route("/")
  .get(
    authController.protect,
    authController.restrictTo("admin"),
    reviewController.getAllReviews
  )
  .post(
    authController.protect,
    authController.restrictTo("user", "admin"),
    reviewController.createReview
  );

router.get(
  "/me",
  authController.protect,
  authController.restrictTo("user", "admin"),
  reviewController.getUserReviews
);

router
  .route("/me/:id")
  .get(
    authController.protect,
    authController.restrictTo("user", "admin"),
    reviewController.getUserReviews
  )
  .patch(
    authController.protect,
    authController.restrictTo("user", "admin"),
    reviewController.updateUserReview
  )
  .delete(
    authController.protect,
    authController.restrictTo("user", "admin"),
    reviewController.deleteUserReview
  );

// Routes for a single review
router
  .route("/:id")
  .get(
    authController.protect,
    authController.restrictTo("admin"),
    reviewController.getReview
  )
  .patch(
    authController.protect,
    authController.restrictTo("admin", "user"),
    reviewController.setProductUserIds,
    reviewController.updateReview
  )
  .delete(
    authController.protect,
    authController.restrictTo("admin"),
    reviewController.deleteReview
  );

// Route to get all responses of a vendor
router
  .route("/vendor/responses")
  .get(
    authController.protect,
    authController.restrictTo("vendor", "admin"),
    reviewController.getVendorResponses
  );

// Route for responding to a review
router
  .route("/:id/respond")
  .patch(
    authController.protect,
    authController.restrictTo("vendor", "admin"),
    reviewController.respondToReview
  );

// Route for updating vendor response
router
  .route("/:id/respond/update")
  .patch(
    authController.protect,
    authController.restrictTo("vendor", "admin"),
    reviewController.updateVendorResponse
  );

// Route for deleting vendor response
router
  .route("/:id/respond/delete")
  .delete(
    authController.protect,
    authController.restrictTo("vendor", "admin"),
    reviewController.deleteVendorResponse
  );

module.exports = router;
