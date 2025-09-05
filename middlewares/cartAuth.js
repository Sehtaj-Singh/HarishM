// middlewares/cartAuth.js
const redis = require("../utils/redisClient");
const secondHandModel = require("../models/secondHandMobileDB");

const CART_TTL_SECONDS = 14 * 24 * 60 * 60; // 14 days
const cartKey = (uid) => `cart:${uid}`;

async function getCartMap(uid) {
  const raw = await redis.get(cartKey(uid));
  return raw ? JSON.parse(raw) : {};
}

async function setCartMap(uid, cartMap) {
  const key = cartKey(uid);
  if (!cartMap || Object.keys(cartMap).length === 0) {
    await redis.del(key);
    return;
  }
  await redis.set(key, JSON.stringify(cartMap), { EX: CART_TTL_SECONDS });
}

// Expand cart map ({productId: qty}) to items for views
async function expandCart(cartMap) {
  const productIds = Object.keys(cartMap);
  if (productIds.length === 0) return { items: [], total: 0 };

  // Fetch products from MongoDB; ignore missing docs gracefully
  const products = await secondHandModel.find({ _id: { $in: productIds } });
  const items = products
    .map((p) => {
      const qty = Number(cartMap[String(p._id)]) || 0;
      return {
        productId: String(p._id),
        name: p.SHname,
        price: Number(p.SHprice) || 0,
        image: p.SHimage,
        qty,
      };
    })
    .filter((i) => i.qty > 0);

  const total = items.reduce((sum, it) => sum + it.price * it.qty, 0);
  return { items, total };
}

module.exports = async function cartMiddleware(req, res, next) {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).send("Unauthorized");

    // Load current cart map from Redis
    let cartMap = await getCartMap(uid);

    // Attach imperative actions the controllers can call without touching Redis/Mongo
    req.cart = {
      // Validate product exists, then add qty and persist
      add: async (productId, qty) => {
        const addQty = Math.max(1, parseInt(qty || "1", 10));
        // Validate product existence
        const product = await secondHandModel.findById(productId);
        if (!product) {
          const err = new Error("Product not found");
          err.status = 404;
          throw err;
        }
        const current = parseInt(cartMap[productId] || "0", 10);
        cartMap[productId] = current + addQty;
        await setCartMap(uid, cartMap);

        // Optionally refresh the view data for immediate use
        const { items, total } = await expandCart(cartMap);
        res.locals.cartItems = items;
        res.locals.cartTotal = total;
      },

      // Ensure the item exists, then remove and persist
      remove: async (productId) => {
        if (!cartMap[productId]) {
          const err = new Error("❌ Not authorized for this cart item");
          err.status = 403;
          throw err;
        }
        delete cartMap[productId];
        await setCartMap(uid, cartMap);

        // Refresh view data after mutation
        const { items, total } = await expandCart(cartMap);
        res.locals.cartItems = items;
        res.locals.cartTotal = total;
      },

      // Recompute items/total for rendering (useful on GET /cart)
      refreshView: async () => {
        const fresh = await getCartMap(uid); // ensure up-to-date state
        cartMap = fresh; // keep local in sync
        const { items, total } = await expandCart(cartMap);
        res.locals.cartItems = items;
        res.locals.cartTotal = total;
      },

      clear: async () => {
        cartMap = {};
        await setCartMap(uid, cartMap);
        res.locals.cartItems = [];
        res.locals.cartTotal = 0;
      },
    };

    // If this is a remove route with :id, pre-authorize here
    if (req.params?.id) {
      const productId = req.params.id;
      if (!cartMap[productId]) {
        return res.status(403).send("❌ Not authorized for this cart item");
      }
    }

    // For normal GET /cart we want the items ready for rendering
    // Controllers can also call req.cart.refreshView() explicitly if desired
    if (req.method === "GET" && req.path === "/cart") {
      await req.cart.refreshView();
    }

    next();
  } catch (err) {
    console.error("❌ Cart middleware error:", err.message);
    const status = err.status || 500;
    res.status(status).send(status === 500 ? "Server error" : err.message);
  }
};
