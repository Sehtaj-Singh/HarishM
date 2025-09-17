//external module
const express = require(`express`);
const adminRegister = express.Router();

// Add at top with other imports
const admin = require("../firebase/fireBaseAdmin");
const axios = require("axios");
const { encrypt } = require("../utils/cryptoUtil");
const userDB = require("../models/userDB");
const apiKey = process.env.FIREBASE_API_KEY;

// TEMP: Admin registration route (no auth, no OTP)
adminRegister.get("/admin/register", (req, res) => {
  res.render("store/adminRegister");
});

adminRegister.post("/admin/register", async (req, res) => {
  let { name, email, password, phone } = req.body;
  phone = `+91${phone}`;

  try {
    // 1. Create Firebase account
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
      phoneNumber: phone
    });

    // 2. Set custom claim for admin
    await admin.auth().setCustomUserClaims(userRecord.uid, { role: "Admin" });

    // 3. Login to get tokens
    const loginData = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      { email, password, returnSecureToken: true }
    );

    const idToken = loginData.data.idToken;
    const refreshToken = loginData.data.refreshToken;

    // 4. Create session cookie
    const sessionCookie = await admin.auth().createSessionCookie(idToken, {
      expiresIn: 60 * 60 * 24 * 5 * 1000 // 5 days
    });

    // 5. Save admin in DB
    await userDB.create({
      uid: userRecord.uid,
      name,
      email,
      phone,
      sessionCookie: encrypt(sessionCookie),
      refreshToken: encrypt(refreshToken),
    });

    // 6. Set cookie & redirect to admin dashboard
    res.cookie("session", sessionCookie, {
      maxAge: 60 * 60 * 24 * 7 * 1000,
      httpOnly: true,
      secure: true,
    });

    res.redirect("/admin/addMobile");
  } catch (err) {
    console.error("❌ Admin Registration Error:", err.message);
    res.status(500).send("Error creating admin account");
  }
});

exports.adminRegister = adminRegister;