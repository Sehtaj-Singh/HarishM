const mongoose = require(`mongoose`);

const accessorySchema = mongoose.Schema({
  Aname:{type:String, required:true},
  Aprice:{type:Number, required:true},
  Aimage:{type:String, required:true},
  Adiscount:{type:Number, required:true},
  Amrp:{type:Number, required:true},
});


module.exports = mongoose.model(`accessories`,accessorySchema);

