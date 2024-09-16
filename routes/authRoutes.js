const express = require("express");
const router = express.Router();
const multer = require("multer");
const authController = require("../controllers/auth");
const map = require("../utils/map");
const {
  configureImageUpload,
  configurePDFUpload,
  uploadMiddleware,
  upload,
  handleMulterErrors,
} = require("../utils/fileUpload");

const uploadImage = configureImageUpload();
const uploadPDF = configurePDFUpload();

// User authentication routes
// Vendor authentication routes
router.post("/user/signup", authController.signupUser);
router.post("/user/verifyEmail", authController.verifyEmail);
router.put(
  "/user/complete-profile",
  // upload.fields([{ name: "avatar", maxCount: 1 }]),
  uploadImage.single("avatar"), // Handle avatar upload
  authController.protect,
  authController.completeProfileUser
);
router.patch(
  "/user/profile-pic",
  // upload.fields([{ name: "avatar", maxCount: 1 }]),
  uploadImage.single("avatar"), // Handle avatar upload
  authController.protect,
  authController.updateProfilePic
);
// router.get("/user/confirmEmail/:token", authController.confirmEmail);
router.post("/user/loginmobile", authController.sendOTPToMobile);
router.post("/user/verifyotplogin", authController.verifyOTPAndLogin);
router.post("/user/login", authController.login);
router.get("/user/logout", authController.logout);
router.post("/user/forgotpassword", authController.forgotPassword);
router.post("/user/resetpassword/:token", authController.resetPassword);
router.patch(
  "/user/updatemypassword",
  authController.protect,
  authController.updatePassword
);

router.get("/getAddressFromCoordinates", map.getAddressFromCoordinates);
router.patch(
  "/user/:vendorId/approve",
  authController.protect,
  authController.restrictTo("admin"),
  authController.approveVendor
);
router.patch("/user/updateMe", authController.protect, authController.updateMe);
router.post(
  "/user/resendEmailVerification",
  authController.resendEmailVerification
);
router.post(
  "/user/requestAccountDeletion",
  authController.protect,
  authController.requestAccountDeletion
);

// Middleware for handling image upload

// Vendor authentication routes
router.post("/vendor/signup", authController.signupVendor);
router.post("/vendor/verifyEmail", authController.verifyEmail);
router.put(
  "/vendor/complete-profile",
  uploadMiddleware,
  handleMulterErrors,
  authController.protect,
  authController.completeProfileVendor
);
router.patch(
  "/vendor/profile-pic",
  uploadImage.single("avatar"),
  authController.protect,
  authController.updateProfilePic
);
// router.get("/vendor/confirmEmail/:token", authController.confirmEmail);
router.post("/vendor/loginmobile", authController.sendOTPToMobile);
router.post("/vendor/verifyotplogin", authController.verifyOTPAndLogin);
router.post("/vendor/login", authController.login);
router.get("/vendor/logout", authController.logout);
router.post("/vendor/forgotpassword", authController.forgotPassword);
router.post("/vendor/resetpassword/:token", authController.resetPassword);
router.patch(
  "/vendor/updatemypassword",
  authController.protect,
  authController.updatePassword
);
router.post(
  "/vendor/resendEmailVerification",
  authController.resendEmailVerification
);
router.post(
  "/vendor/requestAccountDeletion",
  authController.protect,
  authController.requestAccountDeletion
);

module.exports = router;
