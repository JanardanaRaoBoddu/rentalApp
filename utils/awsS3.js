const {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand,
  ListObjectsCommand,
} = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");

// Configure the S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION?.trim(),
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID?.trim(),
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY?.trim(),
  },
});

// Function to upload file to S3
const uploadFileToS3 = async (file, folderName) => {
  const uploadParams = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: `${folderName}/${uuidv4()}-${file.originalname}`,
    Body: file.buffer,
    ContentType: file.mimetype,
    // ACL: "public-read",
  };

  const command = new PutObjectCommand(uploadParams);

  try {
    const data = await s3Client.send(command);
    return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploadParams.Key}`;
  } catch (err) {
    console.error(`S3 Upload Error: ${err.message}`);
    throw new Error(`S3 Upload Error: ${err.message}`);
  }
};

const listS3Objects = async () => {
  try {
    console.log(process.env.AWS_REGION);
    const data = await s3Client.send(
      new ListObjectsCommand({ Bucket: process.env.S3_BUCKET_NAME })
    );
    console.log("S3 Objects:", data.Contents);
  } catch (err) {
    console.error("S3 List Error:", err.message);
  }
};

// listS3Objects();
// Function to delete unused files from S3
// const deleteUnusedFilesFromS3 = async (filesToDelete) => {
//   const deleteParams = {
//     Bucket: process.env.S3_BUCKET_NAME,
//     Delete: {
//       Objects: filesToDelete.map((file) => ({ Key: file.Key })),
//     },
//   };
//   // Detailed logging for the delete parameters
//   console.log(
//     "Deleting files with params:",
//     JSON.stringify(deleteParams, null, 2)
//   );

//   try {
//     // Send delete command
//     const data = await s3Client.send(new DeleteObjectsCommand(deleteParams));

//     // Log deleted files
//     if (data.Deleted.length > 0) {
//       console.log("Successfully deleted files:", data.Deleted);
//     } else {
//       console.log("No files were deleted.");
//     }

//     // Log any errors
//     if (data.Errors.length > 0) {
//       console.error("Errors deleting files:", data.Errors);
//     }
//   } catch (err) {
//     console.error(`S3 Delete Error: ${err.message}`);
//     // Optionally, throw error to be handled by calling code
//     throw new Error(`S3 Delete Error: ${err.message}`);
//   }
// };

const deleteUnusedFilesFromS3 = async (filesToDelete) => {
  // if (!filesToDelete || !filesToDelete.length) {
  //   throw new Error("No files specified for deletion");
  // }

  const deleteParams = {
    Bucket: process.env.S3_BUCKET_NAME,
    Delete: {
      Objects: filesToDelete.map((file) => ({ Key: file.Key })),
    },
  };

  // Detailed logging for the delete parameters
  // console.log(
  //   "Deleting files with params:",
  //   JSON.stringify(deleteParams, null, 2)
  // );

  try {
    // Send delete command
    const data = await s3Client.send(new DeleteObjectsCommand(deleteParams));

    // Log deleted files
    if (data.Deleted && data.Deleted.length > 0) {
      console.log("Successfully deleted files:", data.Deleted);
    } else {
      console.log("No files were deleted.");
    }

    // Log any errors
    if (data.Errors && data.Errors.length > 0) {
      console.error("Errors deleting files:", data.Errors);
    }
  } catch (err) {
    console.error(`S3 Delete Error: ${err.message}`);
    // Optionally, throw error to be handled by calling code
    throw new Error(`S3 Delete Error: ${err.message}`);
  }
};

module.exports = { uploadFileToS3, deleteUnusedFilesFromS3, listS3Objects };
