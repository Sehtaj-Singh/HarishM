const userDB = require("../models/userDB");

module.exports = async function loadUserFromDB(req, res, next) {
  try {
    if (!req.user || !req.user.uid) {
      return res.redirect("/login");
    }

    // ✅ Load everything except refreshToken + sessionCookie
    const user = await userDB.findOne(
      { uid: req.user.uid },
      { refreshToken: 0, sessionCookie: 0 } // exclude these two fields only
    );

    if (!user) {
      return res.redirect("/login");
    }

    res.locals.user = user; // full doc minus sensitive fields
    next();
  } catch (err) {
    console.error("❌ Error loading user:", err.message);
    res.redirect("/login");
  }
};
