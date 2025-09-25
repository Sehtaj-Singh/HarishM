const redis = require("../utils/redisClient");
const secondHandModel = require("../models/secondHandMobileDB");
const newModel = require("../models/newMobileDB");        // 👈 add this
const accessoryModel = require("../models/accessoryDB"); // 👈 and this
const refreshSession = require("./refreshSession");
const userDB = require("../models/userDB");

const CARTTTLSECONDS = 14 * 24 * 60 * 60; // 14 days

async function getCartMap(uid) {
  const raw = await redis.get(`cart:${uid}`);
  return raw ? JSON.parse(raw) : null;
}

async function setCartMap(uid, cartMap) {
  const key = `cart:${uid}`;
  if (!cartMap || Object.keys(cartMap).length === 0) {
    await redis.del(key);
    return;
  }
  await redis.set(key, JSON.stringify(cartMap), "EX", CARTTTLSECONDS);
}

async function expandCart(cartMap) {
  const productIds = Object.keys(cartMap);
  if (productIds.length === 0) return { items: [], total: 0 };

  const [shProducts, nProducts, aProducts] = await Promise.all([
    secondHandModel.find({ _id: { $in: productIds } }),
    newModel.find({ _id: { $in: productIds } }),
    accessoryModel.find({ _id: { $in: productIds } }),
  ]);

  const items = [];

  // SH items
  shProducts.forEach((p) => {
    const qty = Number(cartMap[String(p._id)]) || 0;
    if (qty > 0) {
      items.push({
        productId: String(p._id),
        name: p.SHname,
        price: Number(p.SHprice) || 0,
        image: p.SHimage,
        condition:p.condition,
        mrp: Number(p.SHmrp) || 0,
        qty,
        category: "SH", // 👈 add category
      });
    }
  });

  // N items
  nProducts.forEach((p) => {
    const qty = Number(cartMap[String(p._id)]) || 0;
    if (qty > 0) {
      items.push({
        productId: String(p._id),
        name: p.Nname,
        price: Number(p.Nprice) || 0,
        image: p.Nimage,
        mrp: Number(p.Nmrp) || 0,
        rating: Number(p.Nrating) || 0,
        qty,
        category: "N",
      });
    }
  });

  // A items
  aProducts.forEach((p) => {
    const qty = Number(cartMap[String(p._id)]) || 0;
    if (qty > 0) {
      items.push({
        productId: String(p._id),
        name: p.Aname,
        price: Number(p.Aprice) || 0,
        image: p.Aimage,
        mrp: Number(p.Amrp) || 0,       // 👈 add MRP
        rating: Number(p.Arating) || 0, // 👈 add rating
        qty,
        category: "A",
      });
    }
  });

  const total = items.reduce((sum, it) => sum + it.price * it.qty, 0);
  return { items, total };
}

module.exports = async function cartAuth(req, res, next) {
  try {
    const sessionCookie = req.cookies?.session;

    // Default guest state
    res.locals.user = null;
    res.locals.cartUserLoggedIn = false;
    res.locals.cartItems = [];
    res.locals.cartTotal = 0;

    // Guest-safe cart API so controllers don't crash
    req.cart = {
      add: async () => {
        const e = new Error("Not authenticated");
        e.status = 401;
        throw e;
      },
      remove: async () => {
        const e = new Error("Not authenticated");
        e.status = 401;
        throw e;
      },
      refreshView: async () => {
        res.locals.cartItems = [];
        res.locals.cartTotal = 0;
      },
      clear: async () => {}
    };

    // If no cookie, stay guest
    if (!sessionCookie) return next();

    // Verify/refresh session to populate req.user
    try {
      await new Promise((resolve, reject) =>
        refreshSession(req, res, (err) => (err ? reject(err) : resolve()))
      );
    } catch {
      // Invalid/expired and refresh failed => stay guest
      return next();
    }

    const uid = req.user?.uid;
    if (!uid) return next();

    // Load user without sensitive fields
    const user = await userDB
      .findOne({ uid }, { refreshToken: 0, sessionCookie: 0 })
      .lean();

    res.locals.user = user || null;

    // Load cart view
    const map = (await getCartMap(uid)) || {};
    const { items, total } = await expandCart(map);

    res.locals.cartUserLoggedIn = true;
    res.locals.cartItems = items;
    res.locals.cartTotal = total;

    // Authenticated cart API
    req.cart = {
      add: async (productId, qty) => {
        const addQty = Math.max(1, parseInt(qty || 1, 10));
        const product = await secondHandModel.findById(productId);
        if (!product) {
          const e = new Error("Product not found");
          e.status = 404;
          throw e;
        }
        const current = (await getCartMap(uid)) || {};
        if (current[productId]) {
         const e = new Error("Already in cart");
         e.status = 409; // conflict
         throw e;
        }
        current[productId] = addQty;
        await setCartMap(uid, current);
        const view = await expandCart(current);
        res.locals.cartItems = view.items;
        res.locals.cartTotal = view.total;
      },

      remove: async (productId) => {
        const current = (await getCartMap(uid)) || {};
        if (current[productId]) delete current[productId];
        await setCartMap(uid, current);
        const view = await expandCart(current);
        res.locals.cartItems = view.items;
        res.locals.cartTotal = view.total;
      },

      refreshView: async () => {
        const current = (await getCartMap(uid)) || {};
        const view = await expandCart(current);
        res.locals.cartItems = view.items;
        res.locals.cartTotal = view.total;
      },

      clear: async () => {
        await setCartMap(uid, {});
        res.locals.cartItems = [];
        res.locals.cartTotal = 0;
      }
    };

    return next();
  } catch (error) {
    console.error("cartAuth error:", error?.message);

    // Fail-open as guest
    res.locals.user = null;
    res.locals.cartUserLoggedIn = false;
    res.locals.cartItems = [];
    res.locals.cartTotal = 0;

    req.cart = {
      add: async () => {
        const e = new Error("Not authenticated");
        e.status = 401;
        throw e;
      },
      remove: async () => {
        const e = new Error("Not authenticated");
        e.status = 401;
        throw e;
      },
      refreshView: async () => {
        res.locals.cartItems = [];
        res.locals.cartTotal = 0;
      },
      clear: async () => {}
    };

    return next();
  }
};
