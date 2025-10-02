// external module
const express = require(`express`);
const adminRouter = express.Router();

const refreshSession = require("../middlewares/refreshSession");

// local module
const adminController = require(`../controllers/admin/adminController`);
const SHcontroller = require(`../controllers/admin/SHcontroller`);
const Ncontroller = require(`../controllers/admin/Ncontroller`);
const Acontroller = require(`../controllers/admin/Acontroller`);

const upload = require('../middlewares/multer');  // ✅ Import multer

// AUTH 
adminRouter.use(refreshSession);

// adminController
adminRouter.get(`/addMobile`, adminController.getAddMobile);
adminRouter.get(`/addMobile/Second-Hand`, adminController.getSHaddMobile);
adminRouter.get(`/addMobile/New`, adminController.getNaddMobile);
adminRouter.get(`/addMobile/Accessory`, adminController.getAaddMobile);
adminRouter.get(`/order`, adminController.getorder);
adminRouter.get(`/mobileList`, adminController.getMobileList);
adminRouter.post('/mobileList/topSelling/:id', adminController.toggleTopSelling);

// ✅ Unified fields for all types
const productUpload = upload.fields([
  { name: "SHimage", maxCount: 1 },    // second-hand front image
  { name: "Nimage", maxCount: 1 },     // new front image
  { name: "Aimage", maxCount: 1 },     // accessory front image
  { name: "detailImage1", maxCount: 1 },
  { name: "detailImage2", maxCount: 1 },
  { name: "detailImage3", maxCount: 1 },
  { name: "detailImage4", maxCount: 1 },
  { name: "detailVideo", maxCount: 1 },
]);

// SHController
adminRouter.post("/addMobile/Second-Hand", productUpload, SHcontroller.postSHaddMobile);
adminRouter.post("/mobileList/delete/SH/:SHmobileId", SHcontroller.postDeleteSHmobile);
adminRouter.get("/edit/Second-Hand/:SHmobileId", SHcontroller.getSHeditMobile);
adminRouter.post("/edit/Second-Hand/:SHmobileId", productUpload, SHcontroller.postSHeditMobile);

// NController
adminRouter.post("/addMobile/new", productUpload, Ncontroller.postNaddMobile);
adminRouter.post(`/mobileList/delete/N/:NmobileId`, Ncontroller.postDeleteNmobile);
adminRouter.get('/edit/new/:NmobileId', Ncontroller.getNeditMobile);
adminRouter.post('/edit/new/:NmobileId', productUpload, Ncontroller.postNeditMobile);

// AController
adminRouter.post("/addMobile/accessory", productUpload, Acontroller.postAaddMobile);
adminRouter.post(`/mobileList/delete/A/:accessoryId`, Acontroller.postDeleteAmobile);
adminRouter.get('/edit/accessory/:accessoryId', Acontroller.getAeditMobile);
adminRouter.post('/edit/accessory/:accessoryId', productUpload, Acontroller.postAeditMobile);

exports.adminRouter = adminRouter;
