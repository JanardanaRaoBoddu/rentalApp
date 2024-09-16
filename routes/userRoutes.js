const express = require("express");
const userController = require("./../controllers/userController");
const router = express.Router();

const auth = require("./../controllers/auth");

router
  .route("/")
  .get(auth.protect, auth.restrictTo("admin"), userController.getAllUsers)
  .post(userController.createUser);

router.delete("/deleteMe", auth.protect, userController.deleteMe);
router.get("/favorites", auth.protect, userController.getFavorites);
router.post("/favorites/:productId", auth.protect, userController.addFavorite);
router.delete(
  "/favorites/:productId",
  auth.protect,
  userController.removeFavorite
);

router.post("/addresses", auth.protect, userController.addAddress);
router.patch(
  "/addresses/:addressId",
  auth.protect,
  userController.updateAddress
);
router.delete(
  "/addresses/:addressId",
  auth.protect,
  userController.deleteAddress
);
router.get("/addresses", auth.protect, userController.getAddresses);

router
  .route("/:id")
  .get(userController.getUser)
  .patch(
    auth.protect,
    auth.restrictTo("admin", "user"),
    userController.updateUser
  )
  .delete(auth.protect, auth.restrictTo("admin"), userController.deleteUser);

router.get("/favorites", auth.protect, userController.getFavorites);

module.exports = router;
