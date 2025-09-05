// External modules
const express = require(`express`);
const resendOtpRouter = express.Router();

// Middlewares
// const requestIgnore = require('../../middlewares/requestIgnore');

// utils
const sendOTP = require(`../Utils/sendOTP`);
const redis = require("../utils/redisClient");

// Apply requestIgnore to all routes in this router
// resendOtpRouter.use(requestIgnore);

resendOtpRouter.post(`/resend-otp`, async (req, res) => {
  try {
    const { verifyType, verifyID } = req.body;
    if (!verifyType || !verifyID) return res.status(400).send("Missing data");

    // Compose Redis key dynamically
    const redisKey = `${verifyType}:${verifyID}`;

    // Get existing session
    const sessionData = await redis.get(redisKey);
    if (!sessionData)
      return res.status(404).send("Session expired or not found.");

    const parsedData = JSON.parse(sessionData);
    const phone = parsedData.phone;  // Standardized to phone
    if (!phone) return res.status(404).send("Phone not found.");

    // Generate and update OTP
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    parsedData.otp = newOtp;
    await redis.set(redisKey, JSON.stringify(parsedData), { EX: 300 });

    console.log(parsedData);

    // Send OTP (via WhatsApp, etc)
    await sendOTP(phone, newOtp);  // Use phone

    return res.status(200).send("OTP resent");
  } catch (err) {
    console.error("Resend OTP error:", err.message);
    res.status(500).send("Error resending OTP.");
  }
});

module.exports = resendOtpRouter;
