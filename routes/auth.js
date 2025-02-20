const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { requireLogin } = require("../middleware/auth");

router.get("/login", (req, res) => {
  res.render("login");
});

router.get("/register", (req, res) => {
  res.render("register");
});

// Handle user registration
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const newUser = new User({ username, email, password });
    await newUser.save();
    req.session.userId = newUser._id;
    res.redirect("/products");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error registering user.");
  }
});

// Handle user login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && (await user.comparePassword(password))) {
      req.session.userId = user._id;
      res.redirect("/products");
    } else {
      res.status(400).send("Invalid email or password.");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Error during login.");
  }
});

// Logout route
router.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

router.get("/profile", requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    res.render("profile", { user });
  } catch (err) {
    res.status(500).send("Error loading profile.");
  }
});

// Handle profile updates
router.post("/profile", requireLogin, async (req, res) => {
  const { username, email, password } = req.body;
  const updateData = { username, email };
  if (password) updateData.password = password;
  try {
    await User.findByIdAndUpdate(req.session.userId, updateData, {
      runValidators: true,
    });
    res.redirect("/profile");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating profile.");
  }
});

module.exports = router;
