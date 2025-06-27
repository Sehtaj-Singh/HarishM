//external modules
const express = require(`express`);
const userRouter = express.Router();

//local module
const userController = require(`../controllers/userController`);

userRouter.get(`/` , userController.getHomePage);
userRouter.get(`/store` , userController.getStore);
userRouter.get(`/orders` , userController.getOrders);
userRouter.get(`/repair` , userController.getRepair);
userRouter.get(`/contact` , userController.getContact);


userRouter.get(`/Second-Hand/Details/:SHmobileId` , userController.getSHdetailPage);
userRouter.get(`/New/Details/:NmobileId` , userController.getNdetailPage);
userRouter.get(`/Accessory/Details/:accessoryId` , userController.getAdetailPage);

module.exports = userRouter;