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

exports.getHomePage = (req, res, next) => {
  Promise.all([secondHandModel.find(), newModel.find(), accessoryModel.find()])
    .then(([registeredSHmobile, registeredNmobile, registeredAmobile]) => {
      const topSellingIds = topSellingStore.getIds();
      res.render("store/main/index", {
        registeredSHmobile,
        registeredNmobile,
        registeredAmobile,
        active: "home",
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


exports.getContact = (req, res, next) => {
  res.render(`store/main/contact`, { active:"contact"});
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
    const qty = parseInt(req.body.qty, 10);

    if (isNaN(qty) || qty < 1) {
      return res.status(400).json({ error: "Invalid quantity" });
    }

    const current = (await req.cart.refreshView(), res.locals.cartItems) || [];
    const item = current.find((i) => i.productId === productId);
    if (!item) {
      return res.status(404).json({ error: "Item not found in cart" });
    }

    // update redis map directly
    const uid = req.user?.uid;
    const redis = require("../utils/redisClient");
    const mapKey = `cart:${uid}`;
    const mapRaw = await redis.get(mapKey);
    const map = mapRaw ? JSON.parse(mapRaw) : {};
    map[productId] = qty;
    await redis.set(mapKey, JSON.stringify(map));

    // refresh cart
    await req.cart.refreshView();

    // calculate totals
    const totalPrice = res.locals.cartItems.reduce(
      (sum, it) => sum + it.price * it.qty,
      0
    );
    const totalMrp = res.locals.cartItems.reduce(
      (sum, it) => sum + (it.mrp || it.price) * it.qty,
      0
    );
    const saved = totalMrp - totalPrice;

    return res.json({
      success: true,
      qty,
      totalPrice,
      totalMrp,
      saved,
    });
  } catch (err) {
    console.error("❌ updateCart error:", err.message);
    return res.status(500).json({ error: "Server error" });
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
