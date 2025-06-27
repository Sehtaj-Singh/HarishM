//external module
const express = require(`express`);
const adminRouter = express.Router();

//local module
const adminController = require(`../controllers/admin/adminController`);
const SHcontroller = require(`../controllers/admin/SHcontroller`);
const Ncontroller = require(`../controllers/admin/Ncontroller`);
const Acontroller = require(`../controllers/admin/Acontroller`);
const repairController = require(`../controllers/admin/repairController`);

const upload = require('../middlewares/multer');  // ✅ Import multer


//adminController
adminRouter.get(`/Admin/addMobile`, adminController.getAddMobile);
adminRouter.get(`/Admin/addMobile/Second-Hand`, adminController.getSHaddMobile);
adminRouter.get(`/Admin/addMobile/New`, adminController.getNaddMobile);
adminRouter.get(`/Admin/addMobile/Accessory`, adminController.getAaddMobile);
adminRouter.get(`/Admin/repair`, adminController.getrepair);
adminRouter.get(`/Admin/order`, adminController.getorder);
adminRouter.get(`/Admin/mobileList`, adminController.getMobileList);
adminRouter.get(`/Admin/repair/Add/Queue`, adminController.getAddRepairQueue);


//SHController
adminRouter.post("/Admin/addMobile/Second-Hand", upload.single('SHimage'), SHcontroller.postSHaddMobile);
adminRouter.post(`/Admin/mobileList/delete/SH/:SHmobileId`, SHcontroller.postDeleteSHmobile);


//NController
adminRouter.post("/Admin/addMobile/New", upload.single('Nimage'), Ncontroller.postNaddMobile);
adminRouter.post(`/Admin/mobileList/delete/N/:NmobileId`, Ncontroller.postDeleteNmobile);

//AController
adminRouter.post("/Admin/addMobile/Accessory", upload.single('Aimage'), Acontroller.postAaddMobile);
adminRouter.post(`/Admin/mobileList/delete/A/:accessoryId`, Acontroller.postDeleteAmobile);

//repairController
adminRouter.post(`/Admin/repair/Add/Queue`, repairController.postAddRepairQueue);
adminRouter.get(`/Admin/repair/Update/Queue`, repairController.getRepairQueue);
adminRouter.post(`/Admin/repair/delete/Queue/:repairId`, repairController.postDeleteRepairQueue);
adminRouter.get(`/Admin/repair/Edit/Queue/:repairId`, repairController.getEditRepairQueue);
adminRouter.post('/Admin/repair/Edit/Queue/:repairId', repairController.postEditRepairQueue);


exports.adminRouter = adminRouter;