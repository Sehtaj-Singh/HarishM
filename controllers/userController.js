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
const topSellingStore = require("../utils/topSellingStore");

//database
const secondHandModel = require(`../models/secondHandMobileDB`);
const newModel = require(`../models/newMobileDB`);
const accessoryModel = require("../models/accessoryDB");
const userDB = require("../models/userDB");
const { isNull } = require("util");
const Contact = require("../models/contactDB");
const Order = require('../models/orderDB');

exports.getHomePage = (req, res, next) => {
  Promise.all([secondHandModel.find(), newModel.find(), accessoryModel.find()])
    .then(([registeredSHmobile, registeredNmobile, registeredAmobile]) => {
      const topSellingIds = topSellingStore.getIds();
      res.render("store/main/index", {
        registeredSHmobile,
        registeredNmobile,
        registeredAmobile,
        active: "home",
        isDetailPage: null,
        topSellingIds,
        cartItems: res.locals.cartItems || [],
        cartTotal: res.locals.cartTotal || 0,
        cartUserLoggedIn: res.locals.cartUserLoggedIn || false,
        user: res.locals.user || null,
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
        isDetailPage: null,
        registeredAmobile,
        active: "store",
      });
    })
    .catch((err) => {
      console.error("Error loading mobile lists:", err);
      res.status(500).send("Failed to load mobile list");
    });
};

exports.getOrders = async (req, res) => {
  try {
    if (!req.user) {
      return res.render('store/main/orders', { user: null,isDetailPage: null, orders: [],active: "orders" });
    }
    const orders = await Order.find({ firebaseUid: req.user.uid }).sort({ createdAt: -1 }).lean();
    res.render('store/main/orders', { user: res.locals.user || null, orders ,isDetailPage: null,active: "orders" });
  } catch (err) {
    console.error("Error loading orders:", err);
    res.status(500).send("Server error");
  }
};


exports.getContact = (req, res, next) => {
  res.render(`store/main/contact`, { isDetailPage: null,active:"contact"});
};

exports.postMessage = async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    await Contact.create({ name, email, phone, message });

    // ✅ Return JSON (not redirect)
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error saving contact:", err);
    res.status(500).json({ success: false });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.render("store/profile", { user: null, active:"profile"});
    }

   const user = await userDB.findOne({ uid: req.user.uid });

    res.render("store/profile", { user, active: "profile" });
  } catch (err) {
    console.error("❌ Profile error:", err.message);
    res.status(500).send("Server error");
  }
};

// Detail page

// Detail page - Second Hand
exports.getSHdetailPage = async (req, res, next) => {
  try {
    const productId = req.params.SHmobileId;
    const p = await secondHandModel.findById(productId);

    if (!p) return res.status(404).send("Product not found");

    // Fetch all SH mobiles except the current one
    const registeredSHmobile = await secondHandModel.find({
      _id: { $ne: productId },
    });

    const product = {
      id: p._id,
      name: p.SHname,
      image: p.SHimage,
      mrp: p.SHmrp,
      price: p.SHprice,
      discount: p.SHdiscount,
      condition: p.condition,
      rating: null,
      category: "SH",
      specs: p.specs || {},
      productDetail: {
        images: p.productDetail?.images || [],
        video: p.productDetail?.video || null,
      },
    };

    res.render("store/detailsPage", {
      product,
      active: "null",
      registeredSHmobile,
      isDetailPage: true,
      registeredNmobile: [],
    });
  } catch (err) {
    console.error("❌ Error fetching SH product:", err.message);
    res.status(500).send("Server error");
  }
};

// Detail page - New Mobile
exports.getNdetailPage = async (req, res, next) => {
  try {
    const productId = req.params.NmobileId;
    const p = await newModel.findById(productId);

    if (!p) return res.status(404).send("Product not found");

    // Fetch all N mobiles except the current one
    const registeredNmobile = await newModel.find({
      _id: { $ne: productId },
    });

    const product = {
      id: p._id,
      name: p.Nname,
      image: p.Nimage,
      mrp: p.Nmrp,
      price: p.Nprice,
      discount: p.Ndiscount,
      condition: null,
      category: "N",
      rating: p.Nrating,
      specs: p.specs || {},
      productDetail: {
        images: p.productDetail?.images || [],
        video: p.productDetail?.video || null,
      },
    };

    res.render("store/detailsPage", {
      product,
      active: "null",
      isDetailPage: true,
      registeredNmobile,
      registeredSHmobile: [],
    });
  } catch (err) {
    console.error("❌ Error fetching N product:", err.message);
    res.status(500).send("Server error");
  }
};


// Detail page - Accessory
exports.getAdetailPage = async (req, res, next) => {
  try {
    const productId = req.params.accessoryId;
    const p = await accessoryModel.findById(productId);

    if (!p) return res.status(404).send("Product not found");

    const product = {
      id: p._id,
      name: p.Aname,
      image: p.Aimage,
      mrp: p.Amrp,
      price: p.Aprice,
      discount: p.Adiscount,
      condition: null,
      rating: p.Arating,
      category: "A",
      specs: p.specs || {},
      productDetail: {
        images: p.productDetail?.images || [],
        video: p.productDetail?.video || null,
      },
    };

    res.render("store/detailsPage", {
      product,
      active: "null",
      isDetailPage: true,
      registeredSHmobile: [],
      registeredNmobile: [],
    });
  } catch (err) {
    console.error("❌ Error fetching A product:", err.message);
    res.status(500).send("Server error");
  }
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
    errors.email = "Email already registered!";
  }
  if (await userDB.findOne({ phone })) {
    errors.phone = "Phone number already registered!";
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



// cart and order
exports.addToCart = async (req, res) => {
  const { productId, qty, redirectTo, buyNow } = req.body;
  const base = redirectTo || req.get("referer") || "/store";
  const u = new URL(base, `${req.protocol}://${req.get("host")}`);

  try {
    await req.cart.add(productId, qty);

    if (buyNow === "true") {   // 👈 check the hidden input
      return res.redirect("/cart?msg=added");
    }

    u.searchParams.set("msg", "added");
    u.searchParams.set("openCart", "1");
    return res.redirect(u.pathname + "?" + u.searchParams.toString());
  } catch (err) {
    const status = err.status || 500;

    if (status === 401) {
      u.searchParams.set("openCart", "login");
      return res.redirect(u.pathname + "?" + u.searchParams.toString());
    }

    if (status === 409) {
      u.searchParams.set("msg", "alreadyInCart");
      u.searchParams.set("openCart", "1");
      return res.redirect(u.pathname + "?" + u.searchParams.toString());
    }

    console.error("❌ addToCart:", err.message);
    return res.status(status).send(status === 500 ? "Server error" : err.message);
  }
};



// GET /cart
exports.viewCart = async (req, res) => {
  try {
    // cartAuth already populated res.locals.cartItems/cartTotal
    return res.render("store/cart", {
      items: res.locals.cartItems,
      total: res.locals.cartTotal,
      user: res.locals.user || null,
       active: null
    });
  } catch (err) {
    console.error("❌ Error rendering cart:", err.message);
    return res.status(500).send("Server error");
  }
};

// POST /cart/remove/:id
exports.removeFromCart = async (req, res) => {
  try {
    const productId = req.params.id;
    await req.cart.remove(productId);
    await req.cart.refreshView();

    const wantsJson =
      req.get("x-requested-with") === "fetch" ||
      (req.accepts(["json", "html"]) === "json");

    if (wantsJson) {
      return res.json({
        success: true,
        items: res.locals.cartItems,
        total: res.locals.cartTotal,
        message: "Product removed successfully",
      });
    }

    // Non-JS fallback
    const referer = req.get("referer") || "/cart";
    const u = new URL(referer, `${req.protocol}://${req.get("host")}`);
    const isEmpty = !res.locals.cartItems || res.locals.cartItems.length === 0;

    if (!isEmpty) {
      u.searchParams.set("openCart", "1");
    } else {
      u.searchParams.delete("openCart");
    }

    // 👇 set toast flag for removal
    u.searchParams.set("msg", "removed");

    return res.redirect(u.pathname + "?" + u.searchParams.toString());
  } catch (err) {
    console.error("❌ Error removing from cart:", err.message);
    const status = err.status || 500;

    if (
      req.get("x-requested-with") === "fetch" ||
      (req.accepts(["json", "html"]) === "json")
    ) {
      return res
        .status(status)
        .json({ success: false, error: err.message });
    }

    return res
      .status(status)
      .send(status === 500 ? "Server error" : err.message);
  }
};


// POST /cart/update/:id
exports.updateCart = async (req, res) => {
  try {
    const productId = req.params.id;
    let qty = parseInt(req.body.qty, 10);

    if (isNaN(qty) || qty < 0) {
      return res.status(400).json({ success: false, error: "Invalid quantity" });
    }

    // ensure we have the latest view
    await req.cart.refreshView();
    const current = res.locals.cartItems || [];

    // compare ids as strings so ObjectId vs string doesn't break
    const found = current.find(
      (i) => String(i.productId) === String(productId) || String(i._id) === String(productId)
    );

    // allow qty === 0 (meaning remove) — but if item not in cart and qty > 0, fail
    if (!found && qty > 0) {
      return res.status(404).json({ success: false, error: "Item not found in cart" });
    }

    // update redis map directly
    const uid = req.user?.uid || req.sessionID || `guest:${req.ip}`;
    const redis = require("../utils/redisClient");
    const mapKey = `cart:${uid}`;
    const mapRaw = await redis.get(mapKey);
    const map = mapRaw ? JSON.parse(mapRaw) : {};

    if (qty === 0) {
      // remove the key
      delete map[productId];
    } else {
      map[productId] = qty;
    }
    await redis.set(mapKey, JSON.stringify(map));

    // refresh cart data so res.locals.cartItems reflects the change
    await req.cart.refreshView();
    const items = res.locals.cartItems || [];

    // totals
    const totalPrice = items.reduce((sum, it) => sum + (it.price || 0) * (it.qty || 0), 0);
    const totalMrp = items.reduce((sum, it) => sum + (it.mrp || it.price || 0) * (it.qty || 0), 0);
    const saved = totalMrp - totalPrice;

    // compute per-line subtotal (if still present)
    const updatedItem = items.find(
      (i) => String(i.productId) === String(productId) || String(i._id) === String(productId)
    );
    const lineTotal = updatedItem ? (updatedItem.price || 0) * (updatedItem.qty || 0) : 0;
    const removed = !updatedItem; // true when item no longer in cart

    return res.json({
      success: true,
      qty: qty,
      lineTotal,
      totalPrice,
      totalMrp,
      saved,
      removed,
    });
  } catch (err) {
    console.error("❌ updateCart error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};



// payment

exports.createOrder = async (req, res) => {
  try {
    await req.cart.refreshView();

    const items = res.locals.cartItems || [];
    const total = res.locals.cartTotal || 0;

    if (total <= 0) return res.status(400).json({ error: "Cart is empty" });

    const amount = Math.round(total * 100); // paise

    const razorOrder = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: { userId: req.user?.uid || "" },
    });

    // ✅ Only return to frontend — do not save anything yet
    res.json({
      key: process.env.RAZORPAY_KEY_ID,
      id: razorOrder.id,
      amount: razorOrder.amount,
      currency: razorOrder.currency,
      items: items.map((it) => ({
        productId: it.productId || it._id || String(it.id || ""),
      })),
    });
  } catch (err) {
    console.error("❌ Error creating order:", err);
    res.status(500).json({ error: "Unable to create order" });
  }
};


exports.verifyPayment = async (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body;

    // 1️⃣ Verify Razorpay signature
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    if (expected !== signature) {
      console.warn("❌ Signature mismatch — payment invalid");
      return res.status(400).json({ success: false, error: "Invalid signature" });
    }

    console.log("✅ Razorpay payment verified:", orderId);

    // 2️⃣ Refresh cart and calculate totals
    await req.cart.refreshView();
    const cartItems = res.locals.cartItems || [];
    const total = res.locals.cartTotal || 0;

    if (!cartItems.length || total <= 0) {
      console.warn("⚠️ Cart empty at verify step");
      return res.status(400).json({ success: false, error: "Cart empty" });
    }

    // 3️⃣ Create order items (nested)
    const orderItems = cartItems.map((it) => ({
      productId: it.productId || it._id || String(it.id || ""),
      razorpay_payment_id: paymentId,
      orderId: orderId,
      total: total,
      createdAt: new Date(),
    }));

    // 4️⃣ Save new order in DB
    const orderDoc = await Order.create({
      firebaseUid: req.user?.uid || null,
      userId: res.locals.user?._id || null,
      items: orderItems,
      createdAt: new Date(),
    });

    console.log("✅ Order saved:", orderDoc._id);

    // 5️⃣ Clear cart after successful save
    if (req.cart.clear) await req.cart.clear();

    // 6️⃣ Respond success
    res.json({
      success: true,
      message: "Payment verified and order saved successfully",
      orderId,
      paymentId,
    });
  } catch (err) {
    console.error("❌ Error verifying payment:", err);
    res.status(500).json({ success: false, error: "Unable to verify payment" });
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
