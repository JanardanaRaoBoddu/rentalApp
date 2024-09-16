// models/bookingModel.js

const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      required: [true, "A booking must have an ID"],
      unique: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "A booking must be associated with a product"],
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: [true, "A booking must be associated with a vendor"],
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "A booking must be associated with a customer"],
    },
    from: {
      type: Date,
      required: [true, "Booking start date is required"],
    },
    to: {
      type: Date,
      required: [true, "Booking end date is required"],
    },
    quantity: {
      type: Number,
      required: [true, "Booking quantity is required"],
    },
    totalPrice: {
      type: Number,
      required: [true, "Total price for the booking is required"],
    },
    payment: {
      paymentId: {
        type: String,
        required: [true, "Payment ID is required"],
      },
      paymentStatus: {
        type: String,
        enum: ["pending", "completed", "failed"],
        default: "pending",
      },
    },
    status: {
      type: String,
      enum: ["confirmed", "pending", "cancelled"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;
