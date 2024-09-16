const express = require("express");
const categoryController = require("./../controllers/categoryController");
const auth = require("./../controllers/auth");

const router = express.Router();

router
  .route("/")
  .post(
    auth.protect,
    auth.restrictTo("superadmin"),
    categoryController.createCategory
  )
  .get(categoryController.getAllCategories);

router
  .route("/:id")
  .get(categoryController.getCategory)
  .patch(
    auth.protect,
    auth.restrictTo("superadmin"),
    categoryController.updateCategory
  )
  .delete(
    auth.protect,
    auth.restrictTo("superadmin"),
    categoryController.deleteCategory
  );
module.exports = router;
