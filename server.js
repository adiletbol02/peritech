require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const bodyParser = require("body-parser");
const app = express();

const User = require("./models/User");

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// Middlewares
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

// Load current user for every request so that views can access it.
app.use(async (req, res, next) => {
  if (req.session.userId) {
    try {
      const user = await User.findById(req.session.userId);
      res.locals.user = user;
    } catch (e) {
      console.error(e);
      res.locals.user = null;
    }
  } else {
    res.locals.user = null;
  }
  next();
});

// Set view engine
app.set("view engine", "ejs");

// Seed the first admin user if none exists
(async () => {
  try {
    const adminExists = await User.findOne({ isAdmin: true });
    if (!adminExists) {
      const admin = new User({
        username: "admin",
        email: "admin@example.com",
        password: "admin123", // Will be hashed by the pre-save hook
        isAdmin: true,
      });
      await admin.save();
      console.log("Admin user created: admin@example.com / admin123");
    }
  } catch (err) {
    console.error("Error seeding admin user:", err);
  }
})();

// Routes
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const adminRoutes = require("./routes/admin");
const cartRoutes = require("./routes/cart");
const ordersRoutes = require("./routes/orders");

app.use("/", authRoutes);
app.use("/products", productRoutes);
app.use("/admin", adminRoutes);
app.use("/cart", cartRoutes);
app.use("/orders", ordersRoutes);
app.use(express.static("public"));

// Default route
app.get("/", (req, res) => res.redirect("/products"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
