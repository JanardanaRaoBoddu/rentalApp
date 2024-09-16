const mongoose = require("mongoose");

const subCategorySchema = mongoose.Schema(
  {
    subCategory_name: {
      type: String,
      required: [true, "A subCategory must have a name"],
      unique: true,
      trim: true,
      maxLength: [
        40,
        "A subCategory name must have less or equal to 40 characters",
      ],
    },
    description: {
      type: String,
      required: [true, "A subCategory must have a description"],
    },
    category: {
      type: mongoose.Schema.ObjectId,
      ref: "Category",
      required: [true, "A subcategory must belong to a category"],
    },
  },
  { timestamps: true }
);

const Subcategory = mongoose.model("Subcategory", subCategorySchema);

module.exports = Subcategory;
