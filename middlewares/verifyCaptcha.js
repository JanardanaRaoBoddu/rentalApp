const AppError = require("./../utils/appError");

exports.verifyCaptcha = (req, res, next) => {
  const { captcha } = req.body;
  if (captcha !== req.session.captcha) {
    return next(new AppError("Invalid captcha", 400));
  }
  next();
};
