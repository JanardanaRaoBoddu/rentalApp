const Category = require("../models/categoryModel");
const SubCategory = require("./../models/subCategoryModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

exports.createSubCategory = catchAsync(async (req, res, next) => {
  const { subCategory_name, description, category } = req.body;

  if (!subCategory_name || !category) {
    return next(
      new AppError("Subcategory name and category ID are required", 400)
    );
  }

  const newSubcategory = await SubCategory.create({
    subCategory_name,
    description,
    category,
  });

  res.status(201).json({
    status: "success",
    data: {
      subcategory: newSubcategory,
    },
  });
});

exports.getAllSubCategories = catchAsync(async (req, res) => {
  const subCategories = await SubCategory.find().populate(
    "category",
    "category_name"
  );
  res.status(200).json({
    status: "success",
    requestedAt: req.requestTime,
    results: subCategories.length,
    data: {
      subCategories,
    },
  });
});

exports.getSubcategoryById = catchAsync(async (req, res, next) => {
  const subcategory = await SubCategory.findById(req.params.id).populate(
    "category",
    "category_name"
  );
  if (!subcategory) {
    return next(new AppError("Subcategory not found", 404));
  }
  res.status(200).json({ status: "success", data: { subcategory } });
});

exports.updateSubcategory = catchAsync(async (req, res, next) => {
  const subcategory = await SubCategory.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );
  if (!subcategory) {
    return next(new AppError("Subcategory not found", 404));
  }
  res.status(200).json({ status: "success", data: { subcategory } });
});

exports.deleteSubcategory = catchAsync(async (req, res, next) => {
  const subcategory = await SubCategory.findByIdAndDelete(req.params.id);
  if (!subcategory) {
    return next(new AppError("Subcategory not found", 404));
  }
  res.status(204).json({ status: "success", data: null });
});
