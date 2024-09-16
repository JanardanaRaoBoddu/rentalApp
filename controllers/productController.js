/* eslint-disable import/no-useless-path-segments */
const Product = require("./../models/productModel");
const APIFeatures = require("./../utils/apiFeatures");
const catchAsync = require("./../utils/catchAsync");
const Category = require("./../models/categoryModel");
const SubCategory = require("./../models/subCategoryModel");
const AppError = require("./../utils/appError");
const Vendor = require("./../models/vendorModel");
const Review = require("./../models/reviewModel");
const { uploadFileToS3, deleteUnusedFilesFromS3 } = require("./../utils/awsS3");
const factory = require("./handlerFactory");

// Helper function to validate vendor ownership
const validateVendorOwnership = async (product, user) => {
  if (
    user.role === "vendor" &&
    product.vendor.toString() !== user._id.toString()
  ) {
    throw new AppError("You are not authorized to update this product.", 403);
  }
};

// Helper function to validate admin's vendor association
const validateAdminVendorAssociation = async (product, vendorId) => {
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) {
    throw new AppError("No vendor found with that ID", 404);
  }
  if (product.vendor.toString() !== vendorId) {
    throw new AppError(
      "The product is not associated with the provided vendor.",
      400
    );
  }
};

// Helper function to handle file uploads and deletions
const handleFileUploads = async (product, files) => {
  if (files && files.productImages) {
    // Collect existing image URLs for deletion
    const filesToDelete = product.productImages.map((imageUrl) => {
      const fileName = imageUrl.split("/").pop();
      return { Key: `product-images/${fileName}` };
    });

    // Upload new images to S3 and get their URLs
    const imageUrls = await Promise.all(
      files.productImages.map(async (file) => {
        const imageUrl = await uploadFileToS3(file, "product-images");
        return imageUrl;
      })
    );

    // Set the new image URLs in the product
    product.productImages = imageUrls;

    // Delete old images from S3
    await deleteUnusedFilesFromS3(filesToDelete);
  }
};
// Helper function to resolve ObjectIds from names
const resolveObjectIds = async (categoryName, subcategoryName) => {
  let categoryId = null;
  let subcategoryId = null;

  if (categoryName) {
    const category = await Category.findOne({ category_name: categoryName });
    if (category) {
      categoryId = category._id;
    } else {
      throw new AppError("No category found with that name", 404);
    }
  }

  if (subcategoryName) {
    const subcategory = await SubCategory.findOne({
      subCategory_name: subcategoryName,
    });
    if (subcategory) {
      subcategoryId = subcategory._id;
    } else {
      throw new AppError("No subcategory found with that name", 404);
    }
  }

  return { categoryId, subcategoryId };
};
exports.aliasTopProducts = (req, res, next) => {
  req.query.limit = "5";
  req.query.sort = "-ratingsAverage,price";
  req.query.fields = "product_name,description,price,ratingsAverage";
  next();
};

exports.getAllProducts = catchAsync(async (req, res) => {
  const features = new APIFeatures(
    Product.find(),
    // .populate({
    //   path: "vendor", // Populate the vendor field
    //   select: "companyName", // Specify which fields to include from the Vendor model
    // }),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const products = await features.query;

  res.status(200).json({
    status: "success",
    requestedAt: req.requestTime,
    results: products.length,
    data: {
      products,
    },
  });
});

exports.getAllApprovedProducts = catchAsync(async (req, res) => {
  const features = new APIFeatures(
    Product.find({ approved: true }),
    // .populate({
    //   path: "reviews",
    //   // select: "rating review user createdAt", // Select fields you want to include
    // })
    // .populate("category")
    // .populate("subcategory")
    // .populate("vendor"),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const products = await features.query;

  if (!products.length) {
    return res.status(404).json({
      status: "fail",
      message: "No approved products found",
    });
  }

  res.status(200).json({
    status: "success",
    results: products.length,
    data: {
      products,
    },
  });
});

exports.getProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  //   //.populate({
  //   //   path: "vendor", // Populate the vendor field
  //   //   select: "companyName", // Specify which fields to include from the Vendor model
  //   // })
  //  .populate("category")
  //  .populate("subcategory");

  if (!product) {
    return next(new AppError("No product found with that ID", 404));
  }
  res.status(200).json({
    status: "success",
    data: {
      product,
    },
  });
});

exports.getProductsNearBy = catchAsync(async (req, res, next) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) {
    return next(new AppError("Latitude and longitude are required", 400));
  }

  // Convert latitude and longitude to numbers
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  // Validate lat and lng are valid numbers
  if (isNaN(latitude) || isNaN(longitude)) {
    return next(
      new AppError("Latitude and longitude must be valid numbers.", 400)
    );
  }

  // console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);

  // Define radius in radians for 30km
  const radius = 30 / 6378.1; // Earth radius in km

  // Log the radius to verify
  // console.log(`Radius in radians: ${radius}`);

  const features = new APIFeatures(
    Product.find({
      approved: true,
      location: {
        $geoWithin: {
          $centerSphere: [[longitude, latitude], radius],
        },
      },
    }),
    // .populate({
    //   path: "vendor", // Populate the vendor field
    //   select: "companyName", // Specify which fields to include from the Vendor model
    // }),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const products = await features.query;

  if (!products.length) {
    return res.status(404).json({
      status: "fail",
      message: "No products found within 30 km range",
    });
  }

  res.status(200).json({
    status: "success",
    results: products.length,
    data: { products },
  });
});

exports.approveProduct = catchAsync(async (req, res, next) => {
  // Ensure the user is an admin
  if (req.user.role !== "admin" || req.user.role !== "superadmin") {
    return next(
      new AppError("You are not authorized to approve products.", 403)
    );
  }

  // Get the product ID from the request params
  const productId = req.params.id;

  // Find the product by ID
  const product = await Product.findById(productId);

  // If the product is not found, return an error
  if (!product) {
    return next(new AppError("No product found with that ID.", 404));
  }

  if (product.approved === true) {
    return next(new AppError("Product is Already approved", 404));
  }

  // Update the product's approved field to true
  product.approved = true;

  // Save the updated product
  await product.save();

  // Respond with success message
  res.status(200).json({
    status: "success",
    message: "Product approved successfully.",
    data: {
      product,
    },
  });
});
// Function to get products for logged-in vendor (authentication required)
exports.getProductsForLoggedInVendor = catchAsync(async (req, res) => {
  const vendorId = req.user._id; // Use logged-in vendor ID

  const products = await Product.find({ vendor: vendorId });
  // .populate({
  //   path: "vendor", // Populate the vendor field
  //   select: "companyName", // Specify which fields to include from the Vendor model
  // });

  if (!products.length) {
    return res.status(404).json({
      status: "fail",
      message: "No products found for this vendor",
    });
  }

  res.status(200).json({
    status: "success",
    results: products.length,
    data: {
      products,
    },
  });
});

// Function to search products by a specific vendor ID (accessible without logging in)
exports.getProductsByVendorId = catchAsync(async (req, res) => {
  const { vendorId } = req.params;

  const products = await Product.find({ vendor: vendorId });
  // .populate({
  //   path: "vendor", // Populate the vendor field
  //   select: "companyName", // Specify which fields to include from the Vendor model
  // });

  if (!products.length) {
    return res.status(404).json({
      status: "fail",
      message: "No products found for this vendor",
    });
  }

  res.status(200).json({
    status: "success",
    results: products.length,
    data: {
      products,
    },
  });
});

// Helper function to upload product images to S3
const uploadProductImages = async (files) => {
  if (!files || files.length === 0) {
    throw new AppError("At least one product image is required", 400);
  }

  const imageUrls = await Promise.all(
    files.map(async (file) => {
      const imageUrl = await uploadFileToS3(file, "product-images");
      return imageUrl;
    })
  );

  return imageUrls;
};

exports.createProduct = catchAsync(async (req, res, next) => {
  let vendorId;

  // Determine vendorId based on user role
  if (req.user.role === "vendor") {
    vendorId = req.user._id;
  } else if (req.user.role === "admin" || req.user.role === "superadmin") {
    vendorId = req.body.vendor;
    if (!vendorId) {
      return next(
        new AppError("Admin must provide a vendor ID to create a product.", 400)
      );
    }
  } else {
    return next(
      new AppError("You are not authorized to create products.", 403)
    );
  }

  // Parse request body
  const {
    categoryName,
    subcategoryName,
    machineryId,
    modelName,
    manufactureYear,
    condition,
    additionalAttachments,
    availability,
    priceTypes,
    additionalServices,
    quantity, // Add quantity to the parsed fields
    addressId, // Address ID to fetch location coordinates
  } = req.body;

  const productImages = req.files; // Files uploaded via multer
  // // Add debugging logs
  // console.log("Category Name:", categoryName); // Check the value of categoryName
  // console.log("Quantity:", quantity); // Check the value of quantity

  const currentYear = new Date().getFullYear();
  if (manufactureYear < currentYear - 5 || manufactureYear > currentYear) {
    return next(
      new AppError("Manufacture year must be within the last 5 years.", 400)
    );
  }

  if (categoryName === "machinery") {
    console.log("Category is machinery.");
    if (parseInt(quantity, 10) !== 1) {
      return next(
        new AppError("For machinery, the quantity must be exactly 1.", 400)
      );
    }
  }

  if (categoryName !== "machinery") {
    console.log("Category is not machinery.");
    if (quantity < 1) {
      return next(
        new AppError(
          "For non-machinery products, the quantity must be at least 1.",
          400
        )
      );
    }
  }

  if (categoryName !== "machinery" && quantity < 1) {
    return next(
      new AppError(
        "For non-machinery products, the quantity must be at least 1.",
        400
      )
    );
  }

  try {
    // Resolve category and subcategory ObjectIds
    const { categoryId, subcategoryId } = await resolveObjectIds(
      categoryName,
      subcategoryName
    );

    // Upload product images and get URLs
    const imageUrls = await uploadProductImages(productImages);

    // Fetch vendor's address coordinates
    const vendor = await Vendor.findById(vendorId);

    // Ensure vendor exists
    if (!vendor) {
      return next(new AppError("Vendor not found.", 404));
    }

    // Find the selected address by its ID
    const selectedAddress = vendor.addresses.id(addressId);

    // Ensure the address exists
    if (!selectedAddress) {
      return next(new AppError("Selected address not found.", 404));
    }

    // Create and save new product
    const newProduct = new Product({
      category: categoryId,
      subcategory: subcategoryId,
      machineryId,
      modelName,
      manufactureYear,
      condition,
      additionalAttachments,
      availability,
      priceTypes,
      additionalServices,
      productImages: imageUrls, // Attach S3 URLs to productImages field
      quantity, // Set the quantity field
      vendor: vendorId, // Set the vendor ID
      location: {
        type: "Point",
        coordinates: [
          selectedAddress.location.coordinates[0], // Corrected typo here
          selectedAddress.location.coordinates[1], // Corrected typo here
        ],
      },
    });

    // Save product to database
    const savedProduct = await newProduct.save();

    // Respond with success message
    res.status(201).json({
      status: "success",
      data: {
        product: savedProduct,
      },
    });
  } catch (error) {
    // Handle any errors
    next(error);
  }
});
// exports.updateProduct = catchAsync(async (req, res, next) => {
//   const { role } = req.user;
//   const { id } = req.params;

//   // Fetch the existing product
//   const product = await Product.findById(id);
//   if (!product) {
//     return next(new AppError("No product found with that ID", 404));
//   }

//   // Ensure only vendors or admins can update the product
//   if (role !== "admin" && role !== "vendor") {
//     return next(
//       new AppError("You are not authorized to update products.", 403)
//     );
//   }

//   // Validate vendor ownership for vendors
//   if (role === "vendor") {
//     try {
//       await validateVendorOwnership(product, req.user);
//     } catch (error) {
//       return next(error);
//     }
//   }

//   // Validate vendor association for admins
//   if (role === "admin") {
//     const vendorId = req.body.vendor;
//     if (!vendorId) {
//       return next(
//         new AppError(
//           "Admin must provide a vendor ID to update the product.",
//           400
//         )
//       );
//     }
//     try {
//       await validateAdminVendorAssociation(product, vendorId);
//     } catch (error) {
//       return next(error);
//     }
//     Object.assign(product, req.body);
//   }

//   // Vendors can only update specific fields
//   if (role === "vendor") {
//     const allowedUpdates = [
//       "category",
//       "subcategory",
//       "machineryId",
//       "modelName",
//       "manufactureYear",
//       "condition",
//       "additionalAttachments",
//       "availability",
//       "priceTypes",
//       "additionalServices",
//       "productImages",
//     ];

//     allowedUpdates.forEach((field) => {
//       if (req.body[field] !== undefined) {
//         product[field] = req.body[field];
//       }
//     });
//   }

//   // Handle file uploads for productImages if any
//   try {
//     await handleFileUploads(product, req.files);
//   } catch (error) {
//     return next(error);
//   }

//   // Save the updated product
//   await product.save();

//   res.status(200).json({
//     status: "success",
//     data: {
//       product,
//     },
//   });
// });

exports.updateProduct = catchAsync(async (req, res, next) => {
  const { role } = req.user;
  const { id } = req.params;

  // Fetch the existing product
  const product = await Product.findById(id);
  if (!product) {
    return next(new AppError("No product found with that ID", 404));
  }

  // Ensure only vendors or admins can update the product
  if (role !== "admin" && role !== "vendor") {
    return next(
      new AppError("You are not authorized to update products.", 403)
    );
  }

  // Validate vendor ownership for vendors
  if (role === "vendor") {
    try {
      await validateVendorOwnership(product, req.user);
    } catch (error) {
      return next(error);
    }
  }

  // Validate vendor association for admins
  if (role === "admin" || role === "superadmin") {
    const vendorId = req.body.vendor;
    if (!vendorId) {
      return next(
        new AppError(
          "Admin must provide a vendor ID to update the product.",
          400
        )
      );
    }
    try {
      await validateAdminVendorAssociation(product, vendorId);
    } catch (error) {
      return next(error);
    }
    Object.assign(product, req.body);
  }

  // Vendors can only update specific fields
  if (role === "vendor") {
    const allowedUpdates = [
      "category",
      "subcategory",
      "machineryId",
      "modelName",
      "manufactureYear",
      "condition",
      "additionalAttachments",
      "availability",
      "priceTypes",
      "additionalServices",
      "productImages",
      "quantity", // Allow updating quantity
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        product[field] = req.body[field];
      }
    });
  }

  // Validate quantity based on category
  if (req.body.quantity !== undefined) {
    const category = product.category.category_name;

    if (category === "machinery" && req.body.quantity !== 1) {
      return next(
        new AppError("For machinery, the quantity must be exactly 1.", 400)
      );
    } else if (category !== "machinery" && req.body.quantity < 1) {
      return next(
        new AppError(
          "For non-machinery products, the quantity must be at least 1.",
          400
        )
      );
    }
    product.quantity = req.body.quantity;
  }

  // Handle file uploads for productImages if any
  try {
    await handleFileUploads(product, req.files);
  } catch (error) {
    return next(error);
  }

  // Save the updated product
  await product.save();

  res.status(200).json({
    status: "success",
    data: {
      product,
    },
  });
});

exports.deleteProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) {
    return next(new AppError("No product found with that ID", 404));
  }

  // Delete reviews associated with the product
  await Review.deleteMany({ product: req.params.id });

  // Collect all file keys to delete
  const filesToDelete = product.productImages.map((imageUrl) => {
    const fileName = imageUrl.split("/").pop();
    return { Key: `product-images/${fileName}` };
  });
  // Delete product from database
  await Product.findByIdAndDelete(req.params.id);

  // Delete files from S3
  try {
    await deleteUnusedFilesFromS3(filesToDelete);
  } catch (error) {
    return next(new AppError(`S3 Delete Error: ${error.message}`, 500));
  }

  res.status(204).json({ status: "success", data: null });
});

exports.getProductStats = catchAsync(async (req, res) => {
  const stats = await Product.aggregate([
    {
      $match: {
        ratingsAverage: { $gte: 4.5 },
      },
    },
    {
      $group: {
        _id: null,
        numProduct: { $sum: 1 },
        numRatings: { $sum: "$ratingsQuantity" },
        avgRating: { $avg: "$ratingsAverage" },
        avgPrice: { $avg: "$price" },
        minPrice: { $min: "$price" },
        maxPrice: { $max: "$price" },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
  ]);
  res.status(200).json({ status: "success", data: stats });
});

//Searching
exports.searchProductsAndCategories = catchAsync(async (req, res, next) => {
  const { searchTerm } = req.query;
  const regex = new RegExp(searchTerm, "i"); //'i' for case-insensitive search

  try {
    const products = await Product.find({
      $or: [
        { modelName: { $regex: regex } },
        { machineryId: { $regex: regex } },
      ],
    });
    const categories = await Category.find({
      category_name: { $regex: regex },
    });
    const subCategories = await SubCategory.find({
      subCategory_name: { $regex: regex },
    });

    res.status(200).json({
      status: "success",
      data: { products, categories, subCategories },
    });
  } catch (err) {
    next(new AppError("No data found", 500));
  }
});
