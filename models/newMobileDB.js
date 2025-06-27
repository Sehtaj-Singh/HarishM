const mongoose = require(`mongoose`);

const newMobileSchema = mongoose.Schema({
  Nname:{type:String, required:true},
  Nprice:{type:Number, required:true},
  Nimage:{type:String, required:true},
  Ndiscount:{type:Number, required:true},
  Nmrp:{type:Number, required:true},
});


module.exports = mongoose.model(`newMobiles`,newMobileSchema);
