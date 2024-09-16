// routes/attachmentTypeRoutes.js
const express = require("express");
const router = express.Router();
const attachmentTypeController = require("../controllers/attachmentTypeController"); // Adjust path as needed
const auth = require("../controllers/auth");

router.use(auth.protect);

router
  .route("/")
  .post(
    auth.restrictTo("admin", "superadmin"),
    attachmentTypeController.createAttachmentType
  )
  .get(attachmentTypeController.getAllAttachmentTypes);

router
  .route("/:id")
  .get(attachmentTypeController.getAttachmentTypeById)
  .patch(
    auth.restrictTo("admin", "superadmin"),
    attachmentTypeController.updateAttachmentType
  )
  .delete(
    auth.restrictTo("admin", "superadmin"),
    attachmentTypeController.deleteAttachmentType
  );

module.exports = router;
