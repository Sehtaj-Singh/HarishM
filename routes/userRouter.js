//external modules
const express = require(`express`);
const userRouter = express.Router();

//middleware
const refreshSession = require("../middlewares/refreshSession"); // authentication
const loadUserFromDB = require("../middlewares/loadUserFromDB");
const cartAuth = require("../middlewares/cartAuth");

//local module
const userController = require(`../controllers/userController`);

userRouter.get(`/user/register` , userController.getUserRegister);
userRouter.post(`/user/register` , userController.postUserRegister);
userRouter.get(`/user/register/verify-otp` , userController.getUserRegisterVerifyOTP);
userRouter.post(`/user/register/verify-otp` , userController.postUserRegisterVerifyOTP);



userRouter.get(`/` , cartAuth, userController.getHomePage);
userRouter.get(`/store` ,  userController.getStore);
userRouter.get(`/orders` , userController.getOrders);
userRouter.get(`/repair` , userController.getRepair);
userRouter.get(`/contact` , userController.getContact);


userRouter.get(`/Second-Hand/Details/:SHmobileId` , userController.getSHdetailPage);
userRouter.get(`/New/Details/:NmobileId` , userController.getNdetailPage); 
userRouter.get(`/Accessory/Details/:accessoryId` , userController.getAdetailPage);

userRouter.use(refreshSession);
userRouter.use(loadUserFromDB);

userRouter.get(`/profile`, userController.getUserProfile);

userRouter.post("/cart/add" , cartAuth, userController.addToCart);
userRouter.get("/cart" , cartAuth, userController.viewCart);
userRouter.get("/cart/remove/:id" , cartAuth, userController.removeFromCart);

//payment
userRouter.post("/checkout/create-order" , cartAuth , userController.createOrder);
userRouter.post("/checkout/verify" , cartAuth, userController.verifyPayment);

userRouter.post("/user/address",  userController.saveAddress);

module.exports = userRouter;