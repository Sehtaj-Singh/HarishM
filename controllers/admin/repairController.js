const repairModel = require('../../models/repairDB');

exports.postAddRepairQueue = (req,res,next) => {
  const {deviceName,customerName,replacement,replacementCost,status} = req.body ;
  const repairQ = new repairModel({deviceName,customerName,replacement,replacementCost,status});
  repairQ.save().then(() => {
  })
  res.render(`admin/mobileAdded`);
  
};

exports.getRepairQueue = (req,res,next) => {
    repairModel.find()
    .then(repairList => {
      res.render('admin/repairQueue', {
        repairList
      });
    })
    .catch(err => {
      console.error('Error loading repair list:', err);
      res.status(500).send('Failed to load repair data');
    });
 
  
  
};

exports.postDeleteRepairQueue = (req,res,next) => {
  const repairId = req.params.repairId;

  
  repairModel.findByIdAndDelete(repairId)
    .then(() => {
      
      res.redirect('/Admin/repair/Update/Queue'); // Redirect to your update list page
    })
    .catch(err => {
      console.error('Error deleting repair entry:', err);
      res.status(500).send('Failed to delete repair entry.');
    });

};

exports.getEditRepairQueue = (req,res,next) => {
  const repairId = req.params.repairId;

  repairModel.findById(repairId)
    .then(repair => {
      if (!repair) {
        return res.status(404).send('Repair entry not found.');
      }
      res.render('admin/form/editRepairQueue', { repair }); // You’ll create this EJS
    })
    .catch(err => {
      console.error('Error loading repair data:', err);
      res.status(500).send('Error loading repair form.');
    });
};

exports.postEditRepairQueue = (req,res,next) => {
  const repairId = req.params.repairId;
  const { deviceName, customerName, replacement, replacementCost, status } = req.body;

  repairModel.findByIdAndUpdate(repairId, {
    deviceName,
    customerName,
    replacement,
    replacementCost,
    status
  })
    .then(() => {
      res.redirect('/Admin/repair/Update/Queue'); // back to repair list
    })
    .catch(err => {
      console.error('Error updating repair entry:', err);
      res.status(500).send('Failed to update repair entry.');
    });
};


