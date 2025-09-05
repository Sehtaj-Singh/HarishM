// middlewares/checkAdmin.js
function checkAdmin(req, res, next) {
  // Ensure user is authenticated first
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  // Ensure role is Admin
  if (req.user.role !== "Admin") {
    return res.status(403).json({ error: "Admins only" });
  }

  next(); // ✅ Role check passed
}

module.exports = checkAdmin;
