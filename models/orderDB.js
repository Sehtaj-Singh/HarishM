const mongoose = require("mongoose");

// ----- Order Item Schema (nested) -----
const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    razorpay_payment_id: {
      type: String,
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

// ----- Main Order Schema -----
const orderSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    index: true,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  items: [orderItemSchema], // nested order items
 
});

module.exports = mongoose.model("Order", orderSchema);