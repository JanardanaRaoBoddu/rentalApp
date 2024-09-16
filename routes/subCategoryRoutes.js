const express = require("express");
const subCategoryController = require("./../controllers/subCategoryController");
const auth = require("./../controllers/auth");

const router = express.Router();

router
  .route("/")
  .post(subCategoryController.createSubCategory)
  .get(subCategoryController.getAllSubCategories);
router
  .route("/:id")
  .get(subCategoryController.getSubcategoryById)
  .patch(
    auth.protect,
    auth.restrictTo("admin"),
    subCategoryController.updateSubcategory
  )
  .delete(
    auth.protect,
    auth.restrictTo("admin"),
    subCategoryController.deleteSubcategory
  );
module.exports = router;
