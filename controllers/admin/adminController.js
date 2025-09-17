//  DB
const secondHandModel = require(`../../models/secondHandMobileDB`);
const newModel = require(`../../models/newMobileDB`);
const accessoryModel = require("../../models/accessoryDB");

//Utils
const topSellingStore = require("../../utils/topSellingStore");

exports.getAddMobile = (req, res, next) => {
  res.render(`admin/adminAddMobile`);
};

exports.getSHaddMobile = (req, res, next) => {
  res.render(`admin/form/addSecondHandMobile`);
};

exports.getMobileList = (req, res, next) => {
  Promise.all([secondHandModel.find(), newModel.find(), accessoryModel.find()])
    .then(([registeredSHmobile, registeredNmobile, registeredAmobile]) => {
      // get ids (synchronous)
      const topSellingIds = topSellingStore.getIds();
      res.render("admin/adminMobileList", {
        registeredSHmobile,
        registeredNmobile,
        registeredAmobile,
        topSellingIds,
      });
    })
    .catch((err) => {
      console.error("Error loading mobile lists:", err);
      res.status(500).send("Failed to load mobile list");
    });
};

exports.getNaddMobile = (req, res, next) => {
  res.render(`admin/form/addNewMobile`);
};

exports.getAaddMobile = (req, res, next) => {
  res.render(`admin/form/addAccessory`);
};

exports.getrepair = (req, res, next) => {
  res.render(`admin/adminRepair`);
};

exports.getAddRepairQueue = (req, res, next) => {
  res.render(`admin/form/addRepairQueue`);
};

exports.getorder = (req, res, next) => {
  res.render(`admin/adminOrder`);
};

// Add this new action to toggle an id (POST route recommended)
exports.toggleTopSelling = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) return res.redirect("/Admin/mobileList");
    await topSellingStore.toggleId(id);
    return res.redirect("/Admin/mobileList");
  } catch (err) {
    console.error("Error toggling top selling id:", err);
    res.status(500).send("Server error");
  }
};
