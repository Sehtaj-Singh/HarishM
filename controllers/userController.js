// core modules
const redis = require("../utils/redisClient");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const admin = require("../firebase/fireBaseAdmin"); // adjust path as needed
const crypto = require("crypto"); // for payments

//Env
const apiKey = process.env.FIREBASE_API_KEY;

// utils
const sendOTP = require(`../Utils/sendOTP`);
const { encrypt } = require("../utils/cryptoUtil");
const razorpay = require("../utils/razorPay");
const topSellingStore = require('../utils/topSellingStore');

//database
const secondHandModel = require(`../models/secondHandMobileDB`);
const newModel = require(`../models/newMobileDB`);
const accessoryModel = require("../models/accessoryDB");
const repairModel = require("../models/repairDB");
const userDB = require("../models/userDB");

exports.getHomePage = (req, res, next) => {
  Promise.all([secondHandModel.find(), newModel.find(), accessoryModel.find()])
    .then(([registeredSHmobile, registeredNmobile, registeredAmobile]) => {
      const topSellingIds = topSellingStore.getIds(); 
      res.render('store/main/index', {
        registeredSHmobile,
        registeredNmobile,
        registeredAmobile,
        active: "home",
        topSellingIds
      });
    })
    .catch((err) => {
      console.error("Error loading mobile lists:", err);
      res.status(500).send("Failed to load mobile list");
    });
};

exports.getStore = (req, res, next) => {
  Promise.all([secondHandModel.find(), newModel.find(), accessoryModel.find()])
    .then(([registeredSHmobile, registeredNmobile, registeredAmobile]) => {
      res.render(`store/main/store`, {
        registeredSHmobile,
        registeredNmobile,
        registeredAmobile,
        active: "store",
      });
    })
    .catch((err) => {
      console.error("Error loading mobile lists:", err);
      res.status(500).send("Failed to load mobile list");
    });
};

exports.getOrders = (req, res, next) => {
  res.render(`store/main/orders`, { active: "orders" });
};

exports.getRepair = (req, res, next) => {
  repairModel
    .find()
    .then((repairList) => {
      res.render("store/main/repair", {
        repairList,
        active: "repair",
      });
    })
    .catch((err) => {
      console.error("Error loading repair list:", err);
      res.status(500).send("Failed to load repair data");
    });
};

exports.getContact = (req, res, next) => {
  res.render(`store/main/contact`);
};

// Detail page

exports.getSHdetailPage = async (req, res, next) => {
  try {
    const productId = req.params.SHmobileId;
    const product = await secondHandModel.findById(productId);

    if (!product) {
      return res.status(404).send("Product not found");
    }

    res.render("store/SHdetailsPage", { product, active: "null" });
  } catch (err) {
    console.error("❌ Error fetching product details:", err.message);
    res.status(500).send("Server error");
  }
};

exports.getNdetailPage = (req, res, next) => {
  res.render(`store/contact`);
};

exports.getAdetailPage = (req, res, next) => {
  res.render(`store/contact`);
};

// user register
exports.getUserRegister = (req, res, next) => {
  res.render("store/userRegister", {
    errors: {},
    name: "",
    email: "",
    phone: "",
  });
};

exports.postUserRegister = async (req, res, next) => {
  let { name, email, password, phone } = req.body;
  phone = `+91${phone}`; // Prepend and use 'phone' everywhere

  const errors = {};
  if (await userDB.findOne({ email })) {
    errors.email = "❌ Email already registered!";
  }
  if (await userDB.findOne({ phone })) {
    errors.phone = "❌ Phone number already registered!";
  }

  if (errors.email || errors.phone) {
    return res.render("store/userRegister", {
      errors,
      name,
      email,
      phone,
    });
  }

  const verifyType = "register";

  // Step 1: Generate fake OTP (replace with real one)
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  console.log(otp);

  // Step 2: Create temp ID and data
  const verifyID = uuidv4();
  const tempData = {
    name,
    email,
    password,
    phone, // Single name: phone
    otp,
  };

  try {
    // Step 3: Store in Redis with 5 min TTL
    await redis.set(`${verifyType}:${verifyID}`, JSON.stringify(tempData), {
      EX: 300,
    });
    console.log(
      "Temp data saved in Redis with key:",
      `${verifyType}:${verifyID}`,
      tempData
    );

    // Send WhatsApp template message
    await sendOTP(phone, otp); // Use phone

    // Step 4: Redirect to OTP page
    res.redirect(
      `/user/register/verify-otp?verifyType=${verifyType}&verifyID=${verifyID}`
    );
  } catch (err) {
    console.error("Redis Error:", err);
    res.status(500).send("Internal error");
  }
};

exports.getUserRegisterVerifyOTP = async (req, res, next) => {
  const { verifyID, verifyType } = req.query;
  if (!verifyID || !verifyType) return res.send("Invalid link");

  try {
    const redisKey = `${verifyType}:${verifyID}`;
    const registerData = await redis.get(redisKey);
    if (!registerData) return res.send("Session expired or invalid");

    const parsedData = JSON.parse(registerData);

    // Mask phone: +91 XXXXX XX254
    const cleanPhone = parsedData.phone.replace(/^(\+91)?/, ""); // Use phone
    let maskedPhone = parsedData.phone;
    if (cleanPhone.length === 10) {
      maskedPhone = `+91 XXXXX XX${cleanPhone.slice(7)}`;
    }

    res.render("auth/verifyOTP", {
      verifyType,
      verifyID,
      otpAction: "/user/register/verify-otp",
      maskedPhone,
      error: null,
    });
  } catch (err) {
    console.error("Redis error:", err);
    res.status(500).send("Server error");
  }
};

exports.postUserRegisterVerifyOTP = async (req, res, next) => {
  const { verifyType, verifyID, otp } = req.body;
  if (!verifyType || !verifyID || !otp) {
    return res.status(400).send("Missing input values");
  }

  try {
    const redisKey = `${verifyType}:${verifyID}`;
    const userData = await redis.get(redisKey);
    if (!userData) return res.send("❌ OTP expired or invalid");

    const parsedData = JSON.parse(userData);
    if (parsedData.otp !== otp) {
      const cleanPhone = parsedData.phone.replace(/^(\+91)?/, ""); // Use phone
      let maskedPhone = parsedData.phone;
      if (cleanPhone.length === 10) {
        maskedPhone = `+91 XXXXX XX${cleanPhone.slice(7)}`;
      }
      return res.render("auth/verifyOTP", {
        verifyType,
        verifyID,
        otpAction: "/user/register/verify-otp",
        maskedPhone,
        error: "❌ Incorrect OTP",
      });
    }

    // OTP is correct — proceed to register the user
    const userRecord = await admin.auth().createUser({
      email: parsedData.email,
      password: parsedData.password,
      displayName: parsedData.name,
      phoneNumber: parsedData.phone, // Use phone (Firebase expects 'phoneNumber'—rename if needed)
    });

    const loginData = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        email: parsedData.email,
        password: parsedData.password,
        returnSecureToken: true,
      }
    );

    const idToken = loginData.data.idToken;
    const refreshToken = loginData.data.refreshToken;
    const sessionCookie = await admin.auth().createSessionCookie(idToken, {
      expiresIn: 60 * 5 * 1000,
    });

    await userDB.create({
      name: userRecord.displayName,
      uid: userRecord.uid,
      email: parsedData.email,
      phone: parsedData.phone,
      sessionCookie: encrypt(sessionCookie),
      refreshToken: encrypt(refreshToken),
    });

    res.cookie("session", sessionCookie, {
      maxAge: 60 * 60 * 24 * 7 * 1000,
      httpOnly: true,
      secure: true,
    });

    await redis.del(redisKey);
    res.redirect("/");
  } catch (err) {
    console.error("❌ Registration Error:", err.message);
    res.status(500).send("Server error");
  }
};

exports.getUserProfile = (req, res) => {
  res.render("store/profile", { user: res.locals.user });
};

// cart and order

exports.addToCart = async (req, res) => {
  try {
    const { productId, qty } = req.body;
    await req.cart.add(productId, qty);
    // After add, either redirect to cart or wherever you want
    res.redirect("/cart");
  } catch (err) {
    console.error("❌ Error adding to cart:", err.message);
    const status = err.status || 500;
    res.status(status).send(status === 500 ? "Server error" : err.message);
  }
};

exports.viewCart = async (req, res) => {
  try {
    // assuming cart data is prepared by middleware
    res.render("store/cart", {
      items: res.locals.cartItems,
      total: res.locals.cartTotal,
      user: res.locals.user || null,
    });
  } catch (err) {
    console.error("❌ Error rendering cart:", err.message);
    res.status(500).send("Server error");
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    const productId = req.params.id; // treat :id as the productId
    await req.cart.remove(productId);
    res.redirect("/cart");
  } catch (err) {
    console.error("❌ Error removing from cart:", err.message);
    const status = err.status || 500;
    res.status(status).send(status === 500 ? "Server error" : err.message);
  }
};

// payment

exports.createOrder = async (req, res) => {
  try {
    // Ensure cart data is fresh (middleware loads Redis + Mongo)
    await req.cart.refreshView();

    const { items, total } = {
      items: res.locals.cartItems,
      total: res.locals.cartTotal,
    };

    if (total <= 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    const amount = total * 100; // Razorpay uses paise

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: { userId: req.user.uid },
    });

    console.log("✅ Razorpay order created:", order.id);

    res.json({
      key: process.env.RAZORPAY_KEY_ID,
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      items,
    });
  } catch (err) {
    console.error("❌ Error creating order:", err.message);
    res.status(500).json({ error: "Unable to create order" });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body;

    // Verify signature with Razorpay secret
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    if (expected !== signature) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    console.log("✅ Payment verified for order:", orderId);

    // Refresh cart to confirm totals
    await req.cart.refreshView();
    const { items, total } = {
      items: res.locals.cartItems,
      total: res.locals.cartTotal,
    };

    // TODO: Save order to DB here (userId, items, total, Razorpay IDs, status = paid)

    // Clear the cart (Redis) after successful payment
    await req.cart.clear(); // if you add a helper
    // OR directly clear by setting empty cartMap:
    // const redis = require("../utils/redisClient");
    // await redis.del(`cart:${req.user.uid}`);

    res.json({
      success: true,
      message: "Payment verified and cart cleared",
      orderId,
      paymentId,
      amount: total,
    });
  } catch (err) {
    console.error("❌ Error verifying payment:", err.message);
    res.status(500).json({ error: "Unable to verify payment" });
  }
};

// address

exports.saveAddress = async (req, res) => {
  console.log("res.locals.user in saveAddress:", res.locals.user);

  try {
    const userId = res.locals.user?._id; // set by loadUserFromDB
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    // (you already log this)
    console.log("Incoming address:", req.body);

    const { fullName, mobile, flat, area, landmark, city, state, pincode } =
      req.body;
    if (!fullName || !mobile || !flat || !area || !city || !state || !pincode) {
      return res
        .status(400)
        .json({ error: "All required fields must be filled" });
    }

    const address = {
      fullName,
      mobile,
      flat,
      area,
      landmark,
      city,
      state,
      pincode,
    };

    const updated = await userDB.findByIdAndUpdate(
      userId,
      { address },
      { new: true, runValidators: true }
    );

    // optional: quick proof in logs
    console.log("✅ Address saved for:", updated?._id, updated?.address);

    return res.json({ success: true, message: "Address saved" });
  } catch (err) {
    console.error("❌ Error saving address:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};
