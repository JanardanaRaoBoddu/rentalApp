const express = require("express");
const morgan = require("morgan");
const path = require("path");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const cookieParser = require("cookie-parser"); // Import cookie-parser
const productRouter = require("./routes/productRoutes");
const userRouter = require("./routes/userRoutes");
const vendorRouter = require("./routes/vendorRoutes");
const authRouter = require("./routes/authRoutes");
const categoryRouter = require("./routes/categoryRoutes");
const subCategoryRouter = require("./routes/subCategoryRoutes");
const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");
// const attachmentTypeRoutes = require("./routes/attachmentTypeRoutes");
const reviewRouter = require("./routes/reviewRoutes");
const cors = require("cors");

const session = require("express-session");

const app = express();
app.use(cors());

// Uncomment and configure session if needed
// app.use(
//   session({
//     secret: process.env.SESSION_SECRET,
//     resave: false,
//     saveUninitialized: true,
//     cookie: { secure: false }, // Set to true if using HTTPS
//   })
// );

// 1) GLOBAL MIDDLEWARES
// Set Security HTTP headers
app.use(helmet());

// Development logging
console.log(process.env.NODE_ENV);
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Limit requests from the same IP
const limiter = rateLimit({
  max: 200,
  windowMs: 10 * 60 * 1000,
  message: "Too many requests from this IP, please try again after 10 minutes",
});

app.use("/api", limiter);

// Middleware for parsing JSON bodies
app.use(express.json({ limit: "10kb" }));

// Middleware for parsing cookies
app.use(cookieParser());

// Data sanitization against NoSQL Query injection
app.use(mongoSanitize());
// Data sanitization against XSS attacks
app.use(xss());
// Prevent parameter pollution
app.use(
  hpp({
    whitelist: ["price", "ratingsAverage", "ratingsQuantity"],
  })
);

// Serving static files
app.use(express.static(path.join(__dirname, "public")));

// Testing middleware
// app.use((req, res, next) => {
//   console.log("Hello from the middleware");
//   next();
// });

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// ROUTES
app.use("/api/v1/products", productRouter);
// app.use("/api/v1/attachment-types", attachmentTypeRoutes);

app.use("/api/v1/users", userRouter);
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/subCategories", subCategoryRouter);
app.use("/api/v1/vendors", vendorRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/auth", authRouter);

// Static pages
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "loginIn.html"));
});

app.get("/resend-verification", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "resendEmailPage.html"));
});

app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
