//external modules
const express = require(`express`);
const loginRouter = express.Router();

//local module
const loginController = require(`../controllers/loginController`);

loginRouter.get(`/login` , loginController.getLogin);
loginRouter.post(`/login` , loginController.postLogin);


loginRouter.get(`/login/verify-otp` , loginController.getLoginVerifyOTP);
loginRouter.post(`/login/verify-otp` , loginController.postLoginVerifyOTP);

loginRouter.get('/forgot-password', loginController.getForgotPassword);
loginRouter.post('/forgot-password', loginController.postForgotPassword);

loginRouter.get('/forgot-password/verify-otp', loginController.getForgotPassVerifyOTP);
loginRouter.post('/forgot-password/verify-otp', loginController.postForgotPassVerifyOTP);

loginRouter.get('/forgot-password/reset', loginController.getResetPass);
loginRouter.post('/forgot-password/reset', loginController.postResetPass);



module.exports = loginRouter;





