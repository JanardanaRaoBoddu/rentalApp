const express = require("express");
const productController = require("./../controllers/productController");
const auth = require("./../controllers/auth");
const { configureImageUpload } = require("./../utils/fileUpload");
const reviewRouter = require("./../routes/reviewRoutes");
const router = express.Router();

//product routes

// router.param("id", productController.checkID);

// Multer middleware for image uploads
const upload = configureImageUpload();

router
  .route("/top-5-cheap")
  .get(productController.aliasTopProducts, productController.getAllProducts);

router.route("/product-stats").get(productController.getProductStats);

router
  .route("/")
  .get(productController.getAllApprovedProducts)
  .post(
    auth.protect,
    auth.restrictTo("admin", "vendor"),
    upload.array("productImages", 5),
    productController.createProduct
  );

router.get("/getProductsNearby", productController.getProductsNearBy);

router.get(
  "/all",
  auth.protect,
  auth.restrictTo("admin", "superadmin"),
  productController.getAllProducts
);
// Route for approving a product by an admin
router.patch(
  "/approve/:id",
  auth.protect,
  auth.restrictTo("admin", "superadmin"),
  productController.approveProduct
);

router.get("/search", productController.searchProductsAndCategories);

router.get(
  "/me",
  auth.protect,
  auth.restrictTo("vendor"),
  productController.getProductsForLoggedInVendor
);

router.get("/vendor/:vendorId", productController.getProductsByVendorId);

router
  .route("/:id")
  .get(productController.getProduct)
  .patch(
    auth.protect,
    auth.restrictTo("admin", "vendor", "superadmin"),
    upload.array("productImages", 5),
    productController.updateProduct
  )
  .delete(
    auth.protect,
    auth.restrictTo("admin", "vendor", "superadmin"),
    productController.deleteProduct
  );
// Re-route into review router
router.use("/:productId/reviews", reviewRouter);

module.exports = router;
