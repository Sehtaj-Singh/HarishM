const redis = require("../utils/redisClient");
const secondHandModel = require("../models/secondHandMobileDB");
const refreshSession = require("./refreshSession");

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
  const productIds = Object.keys(cartMap || {});
  if (productIds.length === 0) return { items: [], total: 0 };

  const products = await secondHandModel.find({ id: { $in: productIds } });
  const items = products
    .map((p) => {
      const qty = Number(cartMap[String(p.id)]) || 0;
      return {
        productId: String(p.id),
        name: p.SHname,
        price: Number(p.SHprice),
        image: p.SHimage,
        qty,
      };
    })
    .filter((i) => i.qty > 0);

  const total = items.reduce((sum, it) => sum + it.price * it.qty, 0);
  return { items, total };
}

module.exports = async function cartAuth(req, res, next) {
  const sessionCookie = req.cookies.session;

  if (sessionCookie) {
    try {
      await refreshSession(req, res, () => {});
    } catch (error) {
      // Session invalid or refresh failed
      res.locals.cartUserLoggedIn = false;
      res.locals.cartItems = [];
      res.locals.cartTotal = 0;
      return next();
    }
  } else {
    res.locals.cartUserLoggedIn = false;
    res.locals.cartItems = [];
    res.locals.cartTotal = 0;
    return next();
  }

  // At this point req.user is set by refreshSession
  const uid = req.user?.uid;
  if (!uid) {
    res.locals.cartUserLoggedIn = false;
    res.locals.cartItems = [];
    res.locals.cartTotal = 0;
    return next();
  }

  const cartMap = await getCartMap(uid);
  const { items, total } = await expandCart(cartMap);

  res.locals.cartUserLoggedIn = true;
  res.locals.cartItems = items;
  res.locals.cartTotal = total;

  next();
};
