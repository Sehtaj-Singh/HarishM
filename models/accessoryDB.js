const mongoose = require(`mongoose`);

const accessorySchema = mongoose.Schema({
  Aname:{type:String, required:true},
  Aprice:{type:Number, required:true},
  Aimage:{type:String, required:true},
  Adiscount:{type:Number, required:true},
  Amrp:{type:Number, required:true},
  Arating: {
    type: Number,
    required: true,
    min: 0,
    max: 5,
  },

    specs: {
    earphone: {
      brand: { type: String },
      color: { type: String },
      port: { type: String },
      driver: { type: String },
      playTime: { type: String },
      chargingTime: { type: String },
      battery: { type: String },
      bluetooth: { type: String },
      other: { type: String },
    },
    charger: {
      brand: { type: String },
      color: { type: String },
      port: { type: String },
      power: { type: String },
      compatible: { type: String },
      other: { type: String },
    },
    cable: {
      brand: { type: String },
      color: { type: String },
      port: { type: String },
      compatible: { type: String },
      power: { type: String },
      other: { type: String },
    },
  },
});





module.exports = mongoose.model(`accessories`,accessorySchema);

