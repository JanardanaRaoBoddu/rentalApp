const express = require("express");
const vendorController = require("./../controllers/vendorController");

const auth = require("./../controllers/auth");
const router = express.Router();

router.use("/vendor", require("./authRoutes"));
// router.post("/signup", auth.vendorSignup);
// router.get("/auth/confirmEmail/:token", auth.confirmEmail);

// router.post("/login", auth.login);
// router.post("/auth/resendEmailVerification", auth.resendEmailVerification);

// router.post("/forgotpassword", auth.forgotPassword);
// // router.patch("/resetpassword", auth.resetPassword);

router
  .route("/")
  .get(auth.protect, auth.restrictTo("admin"), vendorController.getAllVendors)
  .post(vendorController.createVendour);
router.post("/addresses", auth.protect, vendorController.addAddress);
router.patch(
  "/addresses/:addressId",
  auth.protect,
  vendorController.updateAddress
);
router.delete(
  "/addresses/:addressId",
  auth.protect,
  vendorController.deleteAddress
);
router.get("/addresses", auth.protect, vendorController.getAddresses);
router
  .route("/:id")
  .get(vendorController.getVendour)
  .patch(
    auth.protect,
    auth.restrictTo("admin", "vendor"),
    vendorController.updateVendour
  )
  .delete(
    auth.protect,
    auth.restrictTo("admin"),
    vendorController.deleteVendour
  );

module.exports = router;
