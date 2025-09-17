// core modules
const redis = require("../utils/redisClient");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const admin = require("../firebase/fireBaseAdmin");

// Env
const apiKey = process.env.FIREBASE_API_KEY;

// utils
const sendOTP = require(`../Utils/sendOTP`);
const { encrypt } = require("../utils/cryptoUtil");

// Database
const userDB = require('../models/userDB');

exports.getLogin = (req, res, next) => {
   console.log("GET /login hit from:", req.headers.referer || "direct");
  res.render(`auth/login`, { error: null });
};

exports.postLogin = async (req, res, next) => {
  try {
    const { loginId, password } = req.body;
    let loginEmail;
    let phone;
    let user;
    const isEmail = loginId.includes("@");
    if (isEmail) {
      // Find user in MongoDB by email
      user = await userDB.findOne({ email: loginId });
      if (!user) {
        return res.render("auth/login", { error: "Account not found." });
      }
      loginEmail = user.email;
      phone = user.phone;
    } else {
      // Find user in MongoDB by phone
      // Make sure phone is in the format: +911234567890
      const formattedPhone = loginId.startsWith("+91")
        ? loginId
        : `+91${loginId}`;
      user = await userDB.findOne({ phone: formattedPhone });
      if (!user) {
        return res.render("auth/login", { error: "Account not found." });
      }
      loginEmail = user.email;
      phone = user.phone;
    }
    if (!loginEmail || !phone) {
      return res.render("auth/login", {
        error: "User info incomplete. Try again.",
      });
    }
    // Firebase Identity Toolkit login
    const firebaseRes = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        email: loginEmail,
        password,
        returnSecureToken: true,
      }
    );
    const { idToken, refreshToken, localId: uid } = firebaseRes.data;
    // Store session and OTP in Redis
    const verifyID = uuidv4();
    const verifyType = "login";
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const tempData = {
      uid,
      idToken,
      refreshToken,
      phone, // Single name: phone
      otp,
    };
    console.log(">>> [postLogin] Writing to Redis:", tempData);
    await redis.set(`${verifyType}:${verifyID}`, JSON.stringify(tempData), {
      EX: 300,
    });
    // Send WhatsApp OTP
    await sendOTP(phone, otp); // Use phone
    // Show OTP verify page
    res.redirect(
      `/login/Verify-otp?verifyType=${verifyType}&verifyID=${verifyID}`
    );
  } catch (err) {
    console.error("Login failed:", err.message);
    return res.status(401).render("auth/login", {
      error: "Login failed. Check credentials.",
    });
  }
};

exports.getLoginVerifyOTP = async (req, res, next) => {
  

  const { verifyID, verifyType } = req.query;
  if (!verifyID || !verifyType) return res.send("Invalid link");
  try {
    const redisKey = `${verifyType}:${verifyID}`;
    const registerData = await redis.get(redisKey);
    if (!registerData) return res.send("Session expired or invalid");
    const parsedData = JSON.parse(registerData);
    // Mask phone: +91 XXXXX XX254
    const cleanPhone = parsedData.phone.replace(/^(\+91)?/, ""); // Use phone
    console.log("Rendering OTP page for", verifyType, verifyID);
    let maskedPhone = parsedData.phone;
    if (cleanPhone.length === 10) {
      maskedPhone = `+91 XXXXX XX${cleanPhone.slice(7)}`;
    }
    res.render("auth/verifyOTP", {
      verifyType,
      verifyID,
      otpAction: "/login/verify-otp",
      maskedPhone,
      error: null,
    });
  } catch (err) {
    console.error("Redis error:", err);
    res.status(500).send("Server error");
  }
};

exports.postLoginVerifyOTP = async (req, res, next) => {
  const { verifyType, verifyID, otp } = req.body;
  if (!verifyType || !verifyID || !otp) {
    return res.status(400).send("Missing data");
  }
  let maskedPhone = null;
  try {
    // Get session data from Redis
    const redisKey = `${verifyType}:${verifyID}`;
    const sessionData = await redis.get(redisKey);
    if (!sessionData) {
      return res.status(401).render("auth/verifyOTP", {
        verifyType,
        verifyID,
        otpAction: "/login/verify-otp",
        error: "Session expired. Please login again.",
        maskedPhone,
      });
    }
    const parsedSession = JSON.parse(sessionData);
    const expectedOtp = parsedSession.otp;
    // Validate OTP
    if (otp !== expectedOtp) {
      const phone = parsedSession.phone || "your number"; // Use phone
      const cleanPhone = phone.replace(/^\+91/, "");
      maskedPhone =
        cleanPhone.length === 10 ? `+91 XXXXX XX${cleanPhone.slice(7)}` : phone;
      return res.status(401).render("auth/verifyOTP", {
        verifyType,
        verifyID,
        otpAction: "/login/verify-otp",
        error: "❌ Incorrect OTP. Try again.",
        maskedPhone,
      });
    }
    // OTP correct: Continue with login/session logic
    const { uid, idToken, refreshToken } = parsedSession;
    // Create session cookie (if using Firebase)
    const expiresIn = 60 * 60 * 5 * 1000; // 5 days
    const sessionCookie = await admin
      .auth()
      .createSessionCookie(idToken, { expiresIn });
    // Update user in DB
    const updatedUser = await userDB.findOneAndUpdate(
      { uid },
      {
        sessionCookie: encrypt(sessionCookie),
        refreshToken: encrypt(refreshToken),
      },
      { new: true }
    );
    if (!updatedUser) {
      return res.status(404).send("User record not found in database.");
    }
    // Set session cookie
    res.cookie("session", sessionCookie, {
      maxAge: 60 * 60 * 24 * 7 * 1000,
      httpOnly: true,
      secure: true,
    });
    // Cleanup Redis
    await redis.del(redisKey);
    // Redirect to dashboard or wherever you want
    return res.redirect("/");
  } catch (err) {
    console.error("❌ Error in postLoginVerifyOTP:", err.message);
    return res.status(500).send("Server error");
  }
};

exports.getForgotPassword = (req, res) => {
  res.render("auth/forgotPass", { error: null });
};

// Handle the Forgot Password form submission
// Handle the Forgot Password form submission
exports.postForgotPassword = async (req, res) => {
  try {
    const { loginId } = req.body;
    if (!loginId) {
      return res.render("auth/forgotPass", {
        error: "Please enter email or phone.",
      });
    }

    let user;
    let phone;
    let email;
    const isEmail = loginId.includes("@");

    if (isEmail) {
      user = await userDB.findOne({ email: loginId });
    } else {
      const formattedPhone = loginId.startsWith("+91")
        ? loginId
        : `+91${loginId}`;
      user = await userDB.findOne({ phone: formattedPhone });
    }

    if (!user) {
      return res.render("auth/forgotPass", { error: "Account not found." });
    }

    email = user.email;
    phone = user.phone;

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in Redis for 5 min
    const verifyID = uuidv4();
    const verifyType = "forgotPassword";
    const tempData = { uid: user.uid, phone, otp };
    await redis.set(`${verifyType}:${verifyID}`, JSON.stringify(tempData), {
      EX: 300,
    });

    // Send OTP via WhatsApp
    await sendOTP(phone, otp);

    // Redirect to verify page
    res.redirect(
      `/forgot-password/verify-otp?verifyType=${verifyType}&verifyID=${verifyID}`
    );
  } catch (err) {
    console.error("Error in postForgotPassword:", err.message);
    res.status(500).render("auth/forgotPass", {
      error: "Something went wrong. Please try again.",
    });
  }
};

exports.getForgotPassVerifyOTP = async (req, res) => {
  const { verifyID, verifyType } = req.query;
  if (!verifyID || !verifyType || verifyType !== "forgotPassword") {
    return res.send("Invalid link");
  }

  try {
    const redisKey = `${verifyType}:${verifyID}`;
    const sessionData = await redis.get(redisKey);
    if (!sessionData) {
      return res.send("Session expired or invalid");
    }

    const parsedData = JSON.parse(sessionData);

    // Mask phone for display
    const cleanPhone = parsedData.phone.replace(/^(\+91)?/, "");
    let maskedPhone = parsedData.phone;
    if (cleanPhone.length === 10) {
      maskedPhone = `+91 XXXXX XX${cleanPhone.slice(7)}`;
    }

    res.render("auth/verifyOTP", {
      verifyType,
      verifyID,
      otpAction: "/forgot-password/verify-otp",
      maskedPhone,
      error: null,
    });
  } catch (err) {
    console.error("Error in getForgotPassVerifyOTP:", err);
    res.status(500).send("Server error");
  }
};

exports.postForgotPassVerifyOTP = async (req, res) => {
  const { verifyType, verifyID, otp } = req.body;
  if (!verifyType || !verifyID || !otp || verifyType !== "forgotPassword") {
    return res.status(400).send("Missing or invalid data");
  }

  let maskedPhone = null;

  try {
    const redisKey = `${verifyType}:${verifyID}`;
    const sessionData = await redis.get(redisKey);

    if (!sessionData) {
      return res.status(401).render("auth/verifyOTP", {
        verifyType,
        verifyID,
        otpAction: "/forgot-password/verify-otp",
        error: "Session expired. Please try again.",
        maskedPhone,
      });
    }

    const parsedSession = JSON.parse(sessionData);
    const expectedOtp = parsedSession.otp;

    // Validate OTP
    if (otp !== expectedOtp) {
      const phone = parsedSession.phone || "your number";
      const cleanPhone = phone.replace(/^\+91/, "");
      maskedPhone =
        cleanPhone.length === 10 ? `+91 XXXXX XX${cleanPhone.slice(7)}` : phone;

      return res.status(401).render("auth/verifyOTP", {
        verifyType,
        verifyID,
        otpAction: "/forgot-password/verify-otp",
        error: "❌ Incorrect OTP. Try again.",
        maskedPhone,
      });
    }

    // OTP correct — extend Redis data for reset password
    await redis.set(
      `${verifyType}:${verifyID}`,
      JSON.stringify(parsedSession),
      {
        EX: 600, // 10 min to reset password
      }
    );

    // Redirect to password reset page
    return res.redirect(`/forgot-password/reset?verifyID=${verifyID}`);
  } catch (err) {
    console.error("❌ Error in postForgotPassVerifyOTP:", err.message);
    return res.status(500).send("Server error");
  }
};

exports.getResetPass = async (req, res) => {
  const { verifyID } = req.query;
  if (!verifyID) {
    return res.send("Invalid request");
  }

  try {
    const redisKey = `forgotPassword:${verifyID}`;
    const sessionData = await redis.get(redisKey);

    if (!sessionData) {
      return res.send("Session expired or invalid");
    }

    res.render("auth/resetPass", {
      verifyID,
      error: null,
    });
  } catch (err) {
    console.error("Error in getResetPass:", err.message);
    res.status(500).send("Server error");
  }
};

exports.postResetPass = async (req, res) => {
  const { verifyID, password, confirmPassword } = req.body;

  if (!verifyID || !password || !confirmPassword) {
    return res.render("auth/resetPass", {
      verifyID,
      error: "All fields are required.",
    });
  }

  if (password !== confirmPassword) {
    return res.render("auth/resetPass", {
      verifyID,
      error: "Passwords do not match.",
    });
  }

  if (password.length < 6) {
    return res.render("auth/resetPass", {
      verifyID,
      error: "Password must be at least 6 characters.",
    });
  }

  try {
    const redisKey = `forgotPassword:${verifyID}`;
    const sessionData = await redis.get(redisKey);

    if (!sessionData) {
      return res.render("auth/resetPass", {
        verifyID,
        error: "Session expired. Please try again.",
      });
    }

    const { uid } = JSON.parse(sessionData);

    // Update password in Firebase
    await admin.auth().updateUser(uid, { password });

    // Optional: Update MongoDB if you store hashed passwords locally
    // await userDB.findOneAndUpdate({ uid }, { password: hashedPassword });

    // Delete Redis entry
    await redis.del(redisKey);

    // Redirect to login with success message
    res.redirect("/login?message=Password reset successful. Please login.");
  } catch (err) {
    console.error("Error in postResetPassword:", err.message);
    res.status(500).render("auth/resetPass", {
      verifyID,
      error: "Something went wrong. Please try again.",
    });
  }
};
