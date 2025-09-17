const admin = require("../firebase/fireBaseAdmin");
const axios = require("axios");
const apiKey = process.env.FIREBASE_API_KEY;

//Database
const userDB = require("../models/userDB");

//Utils
const { encrypt } = require("../utils/cryptoUtil");
const { decrypt } = require("../utils/cryptoUtil");

module.exports = async function RefreshSession(req, res, next) {
  const sessionCookie = req.cookies.session;

  // ✅ Step 1: Check if session cookie exists
  if (!sessionCookie) {
    return res.redirect("/login");
  }

  try {
    // ✅ Step 2: Try verifying session cookie
    const decodedClaims = await admin
      .auth()
      .verifySessionCookie(sessionCookie, true);

    

    // ✅ Valid session
    req.user = decodedClaims;
    return next();
  } catch (error) {
    // 🔴 Here comes when token is invalid or expired
    if (error.code === "auth/session-cookie-expired") {
      console.log("⚠️ Session expired, trying refresh token flow...");

      try {
        // Step 3: Decode without verification to extract UID
        let uid;

        try {
          const base64Payload = sessionCookie.split(".")[1];
          const decodedPayload = JSON.parse(
            Buffer.from(base64Payload, "base64").toString("utf8")
          );
          uid = decodedPayload.user_id;
          console.log("🧾 Decoded Session Payload:", decodedPayload);

          if (!uid) {
            throw new Error("UID not found in session payload");
          }
        } catch (decodeErr) {
          console.error(
            "❌ Failed to decode UID from session cookie:",
            decodeErr.message
          );
          res.clearCookie("session");
          return res.redirect("/login");
        }

        // Step 4.1: Check if the session cookie exists in DB and matches
        const adminUser = await userDB.findOne({ uid });
        if (!adminUser || !adminUser.refreshToken || !adminUser.sessionCookie) {
          console.log("❌ Required tokens not found for user:", uid);
          res.clearCookie("session");
          return res.redirect("/login");
        }
        // 🔑 Decrypt stored tokens before using
        const storedSessionCookie = decrypt(adminUser.sessionCookie);
        const storedRefreshToken = decrypt(adminUser.refreshToken);

        if (storedSessionCookie !== sessionCookie) {
          console.log(
            "⚠️ Expired session cookie does not match DB record. Possible reuse or attack."
          );
          res.clearCookie("session");
          return res.redirect("/login");
        }

        const oldRefreshToken = storedRefreshToken;

        // Step 5: Get new idToken using Secure Token API
        const response = await axios.post(
          `https://securetoken.googleapis.com/v1/token?key=${apiKey}`,
          `grant_type=refresh_token&refresh_token=${oldRefreshToken}`,
          {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
          }
        );

        const { id_token: newIdToken, refresh_token: newRefreshToken } =
          response.data;
        // console.log("🧓 Old Refresh Token (from DB):", oldRefreshToken);
        // console.log("🆕 New Refresh Token (from Firebase):", newRefreshToken);
        // console.log("🔁 Firebase Token Response:", response.data);

        // Step 6: Create new session cookie
        const newSessionCookie = await admin
          .auth()
          .createSessionCookie(newIdToken, {
            expiresIn: 60 * 60 * 24 * 7  * 1000, // 1 hour
          });

        console.log("📦 New Session Cookie:", newSessionCookie);
        console.log("📦 Old Session Cookie (from request):", sessionCookie);

        const newDecoded = await admin
          .auth()
          .verifySessionCookie(newSessionCookie, true);

        // Step 7: Set new cookie
        res.cookie("session", newSessionCookie, {
          maxAge: 60 * 60 * 24 * 7 * 1000, // 1 hour
          httpOnly: true,
          secure: true,
          sameSite: "strict",
        });

        // Step 8: Save new refresh token and session cookie
        await userDB.findOneAndUpdate(
          { uid },
          {
            refreshToken: encrypt(newRefreshToken),
            sessionCookie: encrypt(newSessionCookie),
          }
        );
        console.log("✅ Session cookie and refresh token updated in DB");

        req.user = newDecoded;
        return next();
      } catch (refreshError) {
        console.error("❌ Refresh token flow failed:", refreshError.message);
        res.clearCookie("session");
        return res.redirect("/login");
      }
    }

    console.error(
      "❌ Session verification failed:",
      error.code || error.message
    );
    res.clearCookie("session");
    return res.redirect("/login");
  }
};
