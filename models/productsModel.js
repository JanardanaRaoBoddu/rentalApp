// const mongoose = require("mongoose");
// const slugify = require("slugify");

// // Define common fields schema

// const commonFieldsSchema = new mongoose.Schema({
//   productImages: {
//     type: [String],
//     required: true,
//   },
//   availability: {
//     from: {
//       type: Date,
//       required: true,
//     },
//     to: {
//       type: Date,
//       required: true,
//     },
//   },
//   priceTypes: [
//     {
//       type: {
//         type: String,
//         required: true,
//         enum: ["hourly", "daily", "weekly", "monthly", "fixed"],
//       },
//       price: {
//         type: Number,
//         required: true,
//       },
//     },
//   ],
//   quantity: {
//     type: Number,
//     required: true,
//   },
//   location: {
//     type: {
//       type: String,
//       enum: ["Point"],
//       default: "Point",
//     },
//     coordinates: {
//       type: [Number], // [longitude, latitude]
//       index: "2dsphere",
//       required: true,
//     },
//   },
// });

// // Define the static fields schema for machinery
// const staticMachineryFieldsSchema = new mongoose.Schema({
//   machineryId: {
//     type: String,
//     required: true,
//     unique: true,
//   },
//   modelName: {
//     type: String,
//     required: true,
//   },
//   description: {
//     type: String,
//   },
//   manufactureYear: {
//     type: Number,
//     required: true,
//   },
//   additionalAttachments: [
//     {
//       attachmentType: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "AttachmentType",
//         required: true,
//       },
//       price: {
//         type: Number,
//         required: true,
//       },
//     },
//   ],
//   additionalServices: [
//     {
//       serviceType: {
//         type: String,
//         enum: ["driver", "delivery", "pickup"],
//         required: true,
//       },
//       charges: {
//         type: Number,
//         required: true,
//         default: function () {
//           return this.serviceType === "pickup" ? 0 : undefined; // Set charges to 0 for "pickup"
//         },
//       },
//     },
//   ],
// });

// const productSchema = new mongoose.Schema(
//   {
//     category: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Category",
//       required: true,
//     },
//     subcategory: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Subcategory",
//       required: true,
//     },
//     slug: String,
//     // Include common fields
//     commonFields: {
//       type: commonFieldsSchema,
//       required: true,
//     },
//     categorySpecificFields: {
//       type: mongoose.Schema.Types.Mixed, // This will hold dynamically set fields
//     },
//   },
//   {
//     toJSON: { virtuals: true },
//     toObject: { virtuals: true },
//   }
// );

// // Pre-save hook to set slug and dynamically load category-specific fields
// productSchema.pre("save", async function (next) {
//   if (this.modelName) {
//     this.slug = slugify(this.modelName, { lower: true });
//   }

//   if (this.category.toString() === "machinery-category-id") {
//     this.categorySpecificFields = new mongoose.Schema(
//       staticMachineryFieldsSchema
//     ).toObject();
//   } else {
//     try {
//       const config = await DynamicFieldConfig.findOne({
//         subcategory: this.subcategory,
//       });
//       if (config) {
//         const dynamicSchemaFields = {};
//         config.fields.forEach((field) => {
//           dynamicSchemaFields[field.name] = {
//             type:
//               mongoose.Schema.Types[field.type] || mongoose.Schema.Types.Mixed,
//             required: field.required,
//             default: field.default,
//           };
//         });
//         this.categorySpecificFields = dynamicSchemaFields;
//       }
//     } catch (error) {
//       return next(
//         new Error(
//           `Error fetching dynamic fields configuration: ${error.message}`
//         )
//       );
//     }
//   }

//   next();
// });
// // Pre-save hook to dynamically populate category-specific fields and generate slug
// productSchema.pre("save", async function (next) {
//   if (this.isModified("modelName") || this.isModified("category")) {
//     const category = await mongoose.model("Category").findById(this.category);
//     if (!category) {
//       return next(new Error("Invalid category"));
//     }

//     // Generate slug based on modelName and category
//     if (this.commonFields && this.commonFields.modelName) {
//       this.slug = slugify(`${this.commonFields.modelName}-${category.name}`, {
//         lower: true,
//         strict: true,
//       });
//     }

//     switch (category.name) {
//       case "machinery":
//         this.categorySpecificFields = new mongoose.model(
//           "MachineryFields",
//           staticMachineryFieldsSchema
//         )(this.categorySpecificFields);
//         break;
//       case "electronics":
//         this.categorySpecificFields = new mongoose.model(
//           "ElectronicsFields",
//           electronicsFieldsSchema
//         )(this.categorySpecificFields);
//         break;
//       // Add more cases for other categories
//       default:
//         this.categorySpecificFields = {};
//     }
//   }
//   next();
// });

// const Product = mongoose.model("Product", productSchema);

// module.exports = Product;
