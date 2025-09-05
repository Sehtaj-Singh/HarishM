const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  fullName: { type: String, required: true },     // Full name of receiver
  mobile:   { type: String, required: true },   // Mobile number
  flat:     { type: String, required: true }, // Flat / House No / Building / 
  area:     { type: String, required: true },      // Area / Street / Village
  landmark: { type: String },                         // Landmark (optional)
  city:     { type: String, required: true },         // Town / City
  state:    { type: String, required: true },         // State
  pincode:  { type: String, required: true }          // PIN Code
}, { _id: false });  // don’t create _id for sub-doc

const UserSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    unique: true,
  },

  name: {
    type: String,
    required: true,
  },

  email: {
    type: String,
    required: true,     
    unique: true
  },

  phone: {
    type: String,
    required: true,      
    unique: true
  },

  refreshToken: {
    type: String,
    required: true,
  },

  sessionCookie: {
    type: String,
    required: true,
  },

  // 🔹 Address block embedded here
  address: addressSchema
});

module.exports = mongoose.model("User", UserSchema);
