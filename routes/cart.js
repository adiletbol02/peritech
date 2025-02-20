const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const Cart = require("../models/Cart");
const Order = require("../models/Order");
const { requireLogin } = require("../middleware/auth");

async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = new Cart({ user: userId, items: [] });
    await cart.save();
  }
  return cart;
}

router.get("/", requireLogin, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.session.userId }).populate(
      "items.product"
    );
    if (!cart) {
      return res.render("cart", { cartItems: [], totalPrice: 0 });
    }
    let totalPrice = 0;
    const cartItems = cart.items.map((item) => {
      const currentPrice = item.product ? item.product.price : 0;
      const subtotal = currentPrice * item.quantity;
      totalPrice += subtotal;
      return { product: item.product, quantity: item.quantity, subtotal };
    });
    res.render("cart", { cartItems, totalPrice });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving cart.");
  }
});

// Add product to cart
router.post("/add/:id", requireLogin, async (req, res) => {
  const productId = req.params.id;
  try {
    const product = await Product.findById(productId);
    if (!product) return res.status(404).send("Product not found.");
    if (product.inventory < 1)
      return res.status(400).send("Product is out of stock.");

    let cart = await getOrCreateCart(req.session.userId);
    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );
    if (itemIndex > -1) {
      // Check if adding one more exceeds available inventory
      if (cart.items[itemIndex].quantity + 1 > product.inventory) {
        return res
          .status(400)
          .send("Cannot add more than available inventory.");
      }
      cart.items[itemIndex].quantity += 1;
    } else {
      cart.items.push({ product: productId, quantity: 1 });
    }
    await cart.save();
    res.redirect("/cart");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error adding product to cart.");
  }
});

router.post("/update", requireLogin, async (req, res) => {
  const { productId, quantity } = req.body;
  const newQuantity = parseInt(quantity);
  try {
    let cart = await getOrCreateCart(req.session.userId);
    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );
    if (itemIndex === -1) {
      return res.status(404).json({ error: "Item not found in cart." });
    }
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: "Product not found." });
    if (newQuantity > product.inventory) {
      return res
        .status(400)
        .json({ error: "Quantity exceeds available inventory." });
    }
    if (newQuantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = newQuantity;
    }
    await cart.save();
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error updating cart." });
  }
});

// Remove a product from cart
router.post("/remove/:id", requireLogin, async (req, res) => {
  const productId = req.params.id;
  try {
    let cart = await getOrCreateCart(req.session.userId);
    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId
    );
    await cart.save();
    res.redirect("/cart");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error removing item from cart.");
  }
});

// Checkout
router.post("/checkout", requireLogin, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.session.userId });
    if (!cart || cart.items.length === 0) return res.redirect("/cart");

    // Verify that each cart item has sufficient inventory
    for (const item of cart.items) {
      const product = await Product.findById(item.product);
      if (!product) return res.status(404).send(`Product not found.`);
      if (item.quantity > product.inventory) {
        return res
          .status(400)
          .send(`Insufficient inventory for product: ${product.name}.`);
      }
    }

    // Update product inventory and calculate total price
    let totalPrice = 0;
    for (const item of cart.items) {
      const product = await Product.findById(item.product);
      totalPrice += product.price * item.quantity;
      await Product.findByIdAndUpdate(item.product, {
        $inc: { inventory: -item.quantity },
      });
    }

    // Create an order
    const order = new Order({
      user: req.session.userId,
      items: await Promise.all(
        cart.items.map(async (item) => {
          const product = await Product.findById(item.product);
          return {
            product: item.product,
            name: product.name,
            price: product.price,
            quantity: item.quantity,
          };
        })
      ),
      totalPrice: totalPrice,
    });
    await order.save();

    // Clear the cart
    cart.items = [];
    await cart.save();
    res.redirect("/orders");
  } catch (err) {
    console.error(err);
    res.status(500).send("Checkout failed.");
  }
});

module.exports = router;
