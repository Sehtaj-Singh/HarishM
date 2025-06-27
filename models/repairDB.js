const mongoose = require(`mongoose`);

const repairQueueSchema = mongoose.Schema({
  deviceName:{type:String, required:true},
  customerName:{type:String},
  replacement:{type:String, required:true},
  replacementCost:{type:String, required:true},
  status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
  receivedDate: { type: Date, default: () => new Date(new Date().toDateString()) }
});


module.exports = mongoose.model(`RepairQueue`,repairQueueSchema);
