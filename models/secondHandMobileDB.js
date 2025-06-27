const mongoose = require(`mongoose`);

const secondHandMobileSchema = mongoose.Schema({
  SHname:{type:String, required:true},
  SHprice:{type:Number, required:true},
  SHimage:{type:String, required:true},
  condition:{type:String, required:true},
  SHdiscount:{type:Number, required:true},
  SHmrp:{type:Number, required:true},
});


module.exports = mongoose.model(`secondHandMobiles`,secondHandMobileSchema);

