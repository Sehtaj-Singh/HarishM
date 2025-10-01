//external module
const express = require(`express`);
const adminRouter = express.Router();

const refreshSession = require("../middlewares/refreshSession"); // authentication
// const checkAdmin = require("../middlewares/checkAdmin");       // authorization


//local module
const adminController = require(`../controllers/admin/adminController`);
const SHcontroller = require(`../controllers/admin/SHcontroller`);
const Ncontroller = require(`../controllers/admin/Ncontroller`);
const Acontroller = require(`../controllers/admin/Acontroller`);
const repairController = require(`../controllers/admin/repairController`);

const upload = require('../middlewares/multer');  // ✅ Import multer

//AUTH 
adminRouter.use(refreshSession);
// adminRouter.use(checkAdmin);

//adminController
adminRouter.get(`/addMobile`, adminController.getAddMobile);
adminRouter.get(`/addMobile/Second-Hand`, adminController.getSHaddMobile);
adminRouter.get(`/addMobile/New`, adminController.getNaddMobile);
adminRouter.get(`/addMobile/Accessory`, adminController.getAaddMobile);
adminRouter.get(`/repair`, adminController.getrepair);
adminRouter.get(`/order`, adminController.getorder);
adminRouter.get(`/mobileList`, adminController.getMobileList);
adminRouter.get(`/repair/Add/Queue`, adminController.getAddRepairQueue);
adminRouter.post('/mobileList/topSelling/:id', adminController.toggleTopSelling);

// Define fields for all images + video
const productUpload = upload.fields([
  { name: "SHimage", maxCount: 1 },       // front card image
  { name: "detailImage1", maxCount: 1 },
  { name: "detailImage2", maxCount: 1 },
  { name: "detailImage3", maxCount: 1 },
  { name: "detailImage4", maxCount: 1 },
  { name: "detailVideo", maxCount: 1 },
]);
//SHController
adminRouter.post("/addMobile/Second-Hand", productUpload, SHcontroller.postSHaddMobile);
adminRouter.post("/mobileList/delete/SH/:SHmobileId", SHcontroller.postDeleteSHmobile);
adminRouter.get("/edit/Second-Hand/:SHmobileId", SHcontroller.getSHeditMobile);
adminRouter.post("/edit/Second-Hand/:SHmobileId", productUpload, SHcontroller.postSHeditMobile);


//NController
adminRouter.post("/addMobile/new", upload.single('Nimage'), Ncontroller.postNaddMobile);
adminRouter.post(`/mobileList/delete/N/:NmobileId`, Ncontroller.postDeleteNmobile);
adminRouter.get('/edit/new/:NmobileId', Ncontroller.getNeditMobile);
adminRouter.post('/edit/new/:NmobileId', upload.single('Nimage'), 
  Ncontroller.postNeditMobile);


//AController
adminRouter.post("/addMobile/accessory", upload.single('Aimage'), Acontroller.postAaddMobile);
adminRouter.post(`/mobileList/delete/A/:accessoryId`, Acontroller.postDeleteAmobile);
adminRouter.get('/edit/accessory/:accessoryId', Acontroller.getAeditMobile);
adminRouter.post('/edit/accessory/:accessoryId', upload.single('Aimage'), 
  Acontroller.postAeditMobile);

//repairController
adminRouter.post(`/repair/Add/Queue`, repairController.postAddRepairQueue);
adminRouter.get(`/repair/Update/Queue`, repairController.getRepairQueue);
adminRouter.post(`/repair/delete/Queue/:repairId`, repairController.postDeleteRepairQueue);
adminRouter.get(`/repair/Edit/Queue/:repairId`, repairController.getEditRepairQueue);
adminRouter.post('/repair/Edit/Queue/:repairId', repairController.postEditRepairQueue);


exports.adminRouter = adminRouter;