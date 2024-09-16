const AttachmentType = require("../models/attachmentTypeModel"); // Adjust path as needed
const catchAsync = require("../utils/catchAsync"); // Adjust path as needed
const AppError = require("../utils/appError");
// Create a new attachment type
exports.createAttachmentType = catchAsync(async (req, res, next) => {
  const { name } = req.body;
  if (!name) {
    return next(new AppError("Name is required", 400));
  }
  const attachmentTypeExists = await AttachmentType.findOne({ name });
  if (attachmentTypeExists) {
    return next(new AppError("Attachment type already exists", 400));
  }
  const attachmentType = new AttachmentType({ name });

  await attachmentType.save();
  res.status(201).json({
    status: "success",
    data: {
      attachmentType,
    },
  });
});

// Get all attachment types
exports.getAllAttachmentTypes = catchAsync(async (req, res, next) => {
  const attachmentTypes = await AttachmentType.find();
  res.status(200).json({
    status: "success",
    data: {
      attachmentTypes,
    },
  });
});

// Get an attachment type by ID
exports.getAttachmentTypeById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const attachmentType = await AttachmentType.findById(id);
  if (!attachmentType) {
    return next(new Error("Attachment type not found"));
  }
  res.status(200).json({
    status: "success",
    data: {
      attachmentType,
    },
  });
});

// Update an attachment type
exports.updateAttachmentType = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { name } = req.body;
  const attachmentType = await AttachmentType.findByIdAndUpdate(
    id,
    { name },
    { new: true, runValidators: true }
  );
  if (!attachmentType) {
    return next(new Error("Attachment type not found"));
  }
  res.status(200).json({
    status: "success",
    data: {
      attachmentType,
    },
  });
});

// Delete an attachment type
exports.deleteAttachmentType = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const result = await AttachmentType.findByIdAndDelete(id);
  if (!result) {
    return next(new Error("Attachment type not found"));
  }
  res.status(204).json({
    status: "success",
    data: null,
  });
});
