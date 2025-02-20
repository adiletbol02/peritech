const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const { requireLogin } = require("../middleware/auth");

router.get("/", requireLogin, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.session.userId })
      .populate("items.product")
      .sort({ createdAt: -1 });
    res.render("orders", { orders });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving orders.");
  }
});

module.exports = router;
