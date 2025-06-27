const secondHandModel = require(`../models/secondHandMobileDB`);
const newModel = require(`../models/newMobileDB`);
const accessoryModel = require('../models/accessoryDB');
const repairModel = require('../models/repairDB');

exports.getHomePage = (req,res,next) => {

  Promise.all([
    secondHandModel.find(),
    newModel.find(),
    accessoryModel.find()
  ])
    .then(([registeredSHmobile, registeredNmobile, registeredAmobile]) => {
      res.render(`store/index`, {
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

exports.getStore = (req,res,next) => {

  Promise.all([
    secondHandModel.find(),
    newModel.find(),
    accessoryModel.find()
  ])
    .then(([registeredSHmobile, registeredNmobile, registeredAmobile]) => {
      res.render(`store/store`, {
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

exports.getOrders = (req,res,next) => {
  res.render(`store/orders`);
};

exports.getRepair = (req,res,next) => {
  repairModel.find()
  .then(repairList => {
    res.render('store/repair', {
      repairList
    });
  })
  .catch(err => {
    console.error('Error loading repair list:', err);
    res.status(500).send('Failed to load repair data');
  });
  
};

exports.getContact = (req,res,next) => {
  res.render(`store/contact`);
};

// Detail page


exports.getSHdetailPage = (req,res,next) => {
  res.render(`store/SHdetailsPage`);
};


exports.getNdetailPage = (req,res,next) => {
  res.render(`store/contact`);
};

exports.getAdetailPage = (req,res,next) => {
  res.render(`store/contact`);
};