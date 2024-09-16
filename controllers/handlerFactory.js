const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const APIFeatures = require("./../utils/apiFeatures");

const checkUserId = async (req, Model) => {
  let doc;

  // console.log("Document ID from request params:", req.params.id);
  // console.log("User ID from request body:", req.body.userId);
  // console.log("Vendor ID from request body:", req.body.vendorId);

  if (req.user.role === "admin") {
    if (req.body.userId) {
      // console.log("Admin checking document for userId:", req.body.userId);
      doc = await Model.findOne({ _id: req.params.id, user: req.body.userId });
    } else if (req.body.vendorId) {
      // console.log("Admin checking document for vendorId:", req.body.vendorId);
      doc = await Model.findOne({
        _id: req.params.id,
        vendor: req.body.vendorId,
      });
    } else {
      // console.log("Admin fetching document by ID:", req.params.id);
      doc = await Model.findById(req.params.id);
    }
  } else {
    // console.log("Regular user checking document with user ID:", req.user.id);
    doc = await Model.findOne({ _id: req.params.id, user: req.user.id });
  }

  if (!doc) {
    // console.log("No document found with ID:", req.params.id);
    throw new AppError("No document found with that ID", 404);
  }

  return doc;
};

exports.checkUserId = checkUserId;

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await checkUserId(req, Model);
    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }

    // Delete the document
    await Model.findByIdAndDelete(doc._id);
    res.status(204).json({
      status: "success",
      data: null,
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await checkUserId(req, Model);
    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }
    // Update the document
    Object.assign(doc, req.body);
    await doc.save();
    res.status(200).json({
      status: "success",
      data: {
        data: doc,
      },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    // Check if user is authorized to create the document
    await checkUserId(req, Model);

    // Create the document with the provided data
    const newDoc = await Model.create(req.body);

    res.status(201).json({
      status: "success",
      data: {
        data: newDoc,
      },
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);
    const doc = await checkUserId(req, Model);
    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }
    res.status(200).json({
      status: "success",
      data: {
        data: doc,
      },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    let filter = {};
    if (req.params.tourId) filter = { product: req.params.productId };

    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    const doc = await features.query;

    res.status(200).json({
      status: "success",
      results: doc.length,
      data: {
        data: doc,
      },
    });
  });

// exports.deleteOne = (Model) =>
//   catchAsync(async (req, res, next) => {
//     const doc = await Model.findByIdAndDelete(req.params.id);
//     if (!doc) {
//       return next(new AppError("No document found with that ID", 404));
//     }
//     res.status(204).json({
//       status: "success",
//       data: null,
//     });
//   });

// exports.updateOne = (Model) =>
//   catchAsync(async (req, res, next) => {
//     const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
//       new: true,
//       runValidators: true,
//     });
//     if (!doc) {
//       return next(new AppError("No document found with that ID", 404));
//     }
//     res.status(200).json({
//       status: "success",
//       data: {
//         data: doc,
//       },
//     });
//   });

// exports.createOne = (Model) =>
//   catchAsync(async (req, res, next) => {
//     const doc = await Model.create(req.body);

//     res.status(201).json({
//       status: "success",
//       data: {
//         data: doc,
//       },
//     });
//   });

// exports.getOne = (Model, popOptions) =>
//   catchAsync(async (req, res, next) => {
//     let query = Model.findById(req.params.id);
//     if (popOptions) query = query.populate(popOptions);
//     const doc = await query;

//     //Tour.findOne({_id: req.params.id})
//     if (!doc) {
//       return next(new AppError("No document found with that ID", 404));
//     }
//     res.status(200).json({
//       status: "success",
//       data: {
//         data: doc,
//       },
//     });
//   });

// exports.getAll = (Model) =>
//   catchAsync(async (req, res, next) => {
//     // To allow for nested GET reviews on tour (hack)
//     let filter = {};
//     if (req.params.tourId) filter = { tour: req.params.tourId };

//     const features = new APIFeatures(Model.find(filter), req.query)
//       .filter()
//       .sort()
//       .limitFields()
//       .paginate();
//     // const doc = await features.query.explain();
//     const doc = await features.query;

//     // SEND RESPONSE
//     res.status(200).json({
//       status: "success",
//       results: doc.length,
//       data: {
//         data: doc,
//       },
//     });
//   });
