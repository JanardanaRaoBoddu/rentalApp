const Category = require("../models/categoryModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

exports.createCategory = catchAsync(async (req, res) => {
  const newCategory = await Category.create(req.body);
  res.status(202).json({
    status: "success",
    data: {
      category: newCategory,
    },
  });
});

exports.getAllCategories = catchAsync(async (req, res) => {
  const categories = await Category.find();
  res.status(200).json({
    status: "success",
    requestedAt: req.requestTime,
    results: categories.length,
    data: {
      categories,
    },
  });
});
exports.getCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    return next(new AppError("Category not found", 404));
  }
  res.status(200).json({ status: "success", data: { category } });
});
exports.updateCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!category) {
    return next(new AppError("Category not found", 404));
  }
  res.status(200).json({ status: "success", data: { category } });
});

exports.deleteCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) {
    return next(new AppError("Category not found", 404));
  }

  res.status(204).json({ status: "success", data: null });
});
