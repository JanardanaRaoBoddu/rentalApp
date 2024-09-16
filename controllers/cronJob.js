const cron = require("node-cron");
const User = require("./../models/userModel");
const Vendor = require("./../models/vendorModel");
const { deleteUnusedFilesFromS3 } = require("./../utils/awsS3");

// Function to get S3 Key from URL
const getS3KeyFromUrl = (url) => {
  const bucketUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`;
  return url.replace(bucketUrl, "");
};

const startCronJob = () => {
  cron.schedule("* * * * *", async () => {
    //runs for every 15minutes
    const now = Date.now();
    try {
      // Find expired users and vendors
      const usersToDelete = await User.find({
        accountDeletionRequested: true,
        accountDeletionExpires: { $lt: now },
      }).select("avatar");

      const vendorsToDelete = await Vendor.find({
        accountDeletionRequested: true,
        accountDeletionExpires: { $lt: now },
      }).select(
        "avatar proofOfOwnership insuranceCertificate complianceDocuments"
      );

      let filesToDelete = [];

      // Collect files to delete from users
      usersToDelete.forEach((user) => {
        if (user.avatar) {
          filesToDelete.push({ Key: getS3KeyFromUrl(user.avatar) });
        }
      });

      // Collect files to delete from vendors
      vendorsToDelete.forEach((vendor) => {
        if (vendor.avatar) {
          filesToDelete.push({ Key: getS3KeyFromUrl(vendor.avatar) });
        }
        if (vendor.proofOfOwnership) {
          filesToDelete.push({ Key: getS3KeyFromUrl(vendor.proofOfOwnership) });
        }
        if (vendor.insuranceCertificate) {
          filesToDelete.push({
            Key: getS3KeyFromUrl(vendor.insuranceCertificate),
          });
        }
        if (vendor.complianceDocuments) {
          filesToDelete.push({
            Key: getS3KeyFromUrl(vendor.complianceDocuments),
          });
        }
      });

      // console.log("Files to delete:", filesToDelete);

      // Delete files from S3
      if (filesToDelete.length > 0) {
        await deleteUnusedFilesFromS3(filesToDelete);
      }

      // Delete expired users and vendors from database
      await User.deleteMany({
        accountDeletionRequested: true,
        accountDeletionExpires: { $lt: now },
      });

      await Vendor.deleteMany({
        accountDeletionRequested: true,
        accountDeletionExpires: { $lt: now },
      });

      console.log(
        "Expired accounts and related files cleaned up successfully."
      );
    } catch (err) {
      console.error("Error cleaning up expired accounts:", err);
    }
  });
};
module.exports = startCronJob;
