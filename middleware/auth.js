const User = require("../models/User");

const requireLogin = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  next();
};

const requireAdmin = async (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  try {
    const user = await User.findById(req.session.userId);
    if (user && user.isAdmin) {
      return next();
    } else {
      return res.status(403).send("Access denied.");
    }
  } catch (err) {
    return res.status(500).send("Server error.");
  }
};

module.exports = { requireLogin, requireAdmin };
