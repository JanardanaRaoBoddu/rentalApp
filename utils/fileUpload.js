const multer = require("multer");

// Configure image upload (for avatar)
const configureImageUpload = () =>
  multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5 MB file size limit
    },
    fileFilter: (req, file, cb) => {
      if (
        file.fieldname === "avatar" &&
        (file.mimetype === "image/jpeg" || file.mimetype === "image/jpg")
      ) {
        cb(null, true);
      } else {
        cb(new Error("Only JPEG and JPG images are allowed for avatar"), false);
      }
    },
  });

// // Configure PDF upload (for documents)
const configurePDFUpload = () =>
  multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5 MB file size limit
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype === "application/pdf") {
        cb(null, true);
      } else {
        cb(new Error("Only PDF files are allowed for documents"), false);
      }
    },
  });

// Combine both configurations
const uploads = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB file size limit
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "image/jpeg" ||
      file.mimetype === "image/jpg" ||
      file.mimetype === "application/pdf"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, JPG images and PDF files are allowed"));
    }
  },
});

// Define allowed file types
const allowedTypes = {
  avatar: ["image/jpeg", "image/jpg"],
  proofOfOwnership: ["application/pdf"],
  insuranceCertificate: ["application/pdf"],
  complianceDocuments: ["application/pdf"],
};

// Create a single multer instance with a custom file filter
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB file size limit
  },
  fileFilter: (req, file, cb) => {
    const fieldName = file.fieldname;
    const allowedMimeTypes = allowedTypes[fieldName];

    if (allowedMimeTypes) {
      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(
          new Error(
            `Only ${allowedMimeTypes.join(", ")} files are allowed for ${fieldName}`
          ),
          false
        );
      }
    } else {
      cb(new Error(`Unexpected field: ${fieldName}`), false);
    }
  },
});

// Middleware for handling multiple file fields
const uploadMiddleware = upload.fields([
  { name: "avatar", maxCount: 1 },
  { name: "proofOfOwnership", maxCount: 1 },
  { name: "insuranceCertificate", maxCount: 1 },
  { name: "complianceDocuments", maxCount: 1 },
]);
// Middleware to handle specific Multer errors
const handleMulterErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Handle Multer-specific errors
    return res.status(400).json({
      status: "error",
      message: err.message,
      code: err.code,
    });
  } else if (err.message) {
    // Handle other errors (e.g., invalid file type)
    return res.status(400).json({
      status: "error",
      message: err.message,
    });
  }
  next(err);
};

module.exports = {
  handleMulterErrors,
  uploadMiddleware,
  configureImageUpload,
  configurePDFUpload,
  uploads,
};
