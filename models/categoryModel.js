const mongoose = require("mongoose");
const Product = require("./productModel");
const SubCategory = require("./subCategoryModel");
const categorySchema = mongoose.Schema(
  {
    category_name: {
      type: String,
      required: [true, "A category must have a name"],
      unique: true,
      trim: true,
      maxLength: [
        40,
        "A category name must have less or equal to 40 characters",
      ],
    },
    description: {
      type: String,
      required: [true, "A category must have a description"],
    },
  },
  { timestamps: true }
);
// Middleware to remove category references in products before deleting a category
categorySchema.pre("findOneAndDelete", async function (next) {
  try {
    // 'this' refers to the query, not the document
    const categoryId = this.getQuery()._id;

    // Find all products that reference this category and update them
    await Product.updateMany(
      { category: categoryId },
      { $set: { category: null } } // Set the category field to null
    );
    await SubCategory.updateMany(
      { category: categoryId },
      { $set: { category: null } } // Set the category field to null
    );
    next();
  } catch (err) {
    next(err);
  }
});

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;
