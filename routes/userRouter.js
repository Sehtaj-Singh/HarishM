//external modules
const express = require(`express`);
const userRouter = express.Router();

//middleware
const cartAuth = require("../middlewares/cartAuth");

//local module
const userController = require(`../controllers/userController`);

userRouter.get(`/user/register` , userController.getUserRegister);
userRouter.post(`/user/register` , userController.postUserRegister);
userRouter.get(`/user/register/verify-otp` , userController.getUserRegisterVerifyOTP);
userRouter.post(`/user/register/verify-otp` , userController.postUserRegisterVerifyOTP);

userRouter.use(cartAuth);


userRouter.get(`/` ,  userController.getHomePage);
userRouter.get(`/store` ,  userController.getStore);
userRouter.get(`/orders` , userController.getOrders);
userRouter.get(`/repair` , userController.getRepair);
userRouter.get(`/contact` , userController.getContact);


userRouter.get(`/Second-Hand/Details/:SHmobileId` , userController.getSHdetailPage);
userRouter.get(`/New/Details/:NmobileId` , userController.getNdetailPage); 
userRouter.get(`/Accessory/Details/:accessoryId` , userController.getAdetailPage);




userRouter.get(`/profile`, userController.getUserProfile);

userRouter.post("/cart/add" , userController.addToCart);
userRouter.get("/cart" , userController.viewCart);
userRouter.get("/cart/remove/:id" , userController.removeFromCart);
userRouter.post("/cart/update/:id", userController.updateCart);

//payment
userRouter.post("/checkout/create-order" ,  userController.createOrder);
userRouter.post("/checkout/verify" ,  userController.verifyPayment);
userRouter.post("/user/address",  userController.saveAddress);

module.exports = userRouter;