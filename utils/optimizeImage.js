const sharp = require("sharp");

// function to resize and optimize images usimg sharp
const optimizeImages = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const buffer = await sharp(req.file.buffer)
      .resize({ fit: "inside", width: 1200 })
      .toBuffer();
    req.file.buffer = buffer;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = optimizeImages;
