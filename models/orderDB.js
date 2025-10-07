// models/orderModel.js
const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  firebaseUid: { type: String, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  items: [orderItemSchema],
  total: { type: Number, required: true },
  razorpay_order_id: { type: String, required: true },
  razorpay_payment_id: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Order", orderSchema);
