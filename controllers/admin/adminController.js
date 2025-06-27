const secondHandModel = require(`../../models/secondHandMobileDB`);
const newModel = require(`../../models/newMobileDB`);
const accessoryModel = require('../../models/accessoryDB');


exports.getAddMobile = (req,res,next) => {
  res.render(`admin/adminAddMobile`);
};


exports.getSHaddMobile = (req,res,next) => {
  res.render(`admin/form/addSecondHandMobile`);
};


exports.getMobileList = (req, res, next) => {
  Promise.all([
    secondHandModel.find(),
    newModel.find(),
    accessoryModel.find()
  ])
    .then(([registeredSHmobile, registeredNmobile, registeredAmobile]) => {
      res.render('admin/adminMobileList', {
        registeredSHmobile,
        registeredNmobile,
        registeredAmobile
      });
    })
    .catch(err => {
      console.error('Error loading mobile lists:', err);
      res.status(500).send('Failed to load mobile list');
    });
};

exports.getNaddMobile = (req,res,next) => {
  res.render(`admin/form/addNewMobile`);
};


exports.getAaddMobile = (req,res,next) => {
  res.render(`admin/form/addAccessory`);
};


exports.getrepair = (req,res,next) => {
  res.render(`admin/adminRepair`);
};

exports.getAddRepairQueue = (req,res,next) => {
  res.render(`admin/form/addRepairQueue`);
};



exports.getorder = (req,res,next) => {
  res.render(`admin/adminOrder`);
};
