const mongoose = require("mongoose");

// Define the attachment type schema
const attachmentTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true, // Optional: Ensure no leading/trailing spaces
  },
});

// Create a model for AttachmentType
const AttachmentType = mongoose.model("AttachmentType", attachmentTypeSchema);

module.exports = AttachmentType;
