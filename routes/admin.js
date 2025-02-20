const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const User = require("../models/User");
const Order = require("../models/Order");
const { requireAdmin } = require("../middleware/auth");

// Admin dashboard
router.get("/dashboard", requireAdmin, (req, res) => {
  res.render("admin_dashboard_hub");
});

// Sales Trends
router.get("/dashboard/sales", requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, includeBestSeller, viewType } = req.query;
    const selectedView = viewType === "product" ? "product" : "date";

    let match = {};
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) {
        match.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        match.createdAt.$lte = new Date(endDate);
      }
    }

    let salesTrends = [];

    if (selectedView === "date") {
      const pipeline = [];
      if (Object.keys(match).length > 0) {
        pipeline.push({ $match: match });
      }
      pipeline.push({
        $project: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalPrice: 1,
          totalItems: { $sum: "$items.quantity" },
        },
      });
      pipeline.push({
        $group: {
          _id: "$date",
          totalSales: { $sum: "$totalPrice" },
          orderCount: { $sum: 1 },
          totalItems: { $sum: "$totalItems" },
        },
      });
      pipeline.push({ $sort: { _id: 1 } });

      const dailySummary = await Order.aggregate(pipeline);

      let bestSelling = [];
      if (includeBestSeller === "1") {
        let bestPipeline = [];
        if (Object.keys(match).length > 0) {
          bestPipeline.push({ $match: match });
        }
        bestPipeline.push({ $unwind: "$items" });
        bestPipeline.push({
          $lookup: {
            from: "products",
            localField: "items.product",
            foreignField: "_id",
            as: "productInfo",
          },
        });
        bestPipeline.push({ $unwind: "$productInfo" });
        bestPipeline.push({
          $project: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            product: "$items.product",
            productName: "$productInfo.name",
            quantity: "$items.quantity",
          },
        });
        bestPipeline.push({
          $group: {
            _id: {
              date: "$date",
              product: "$product",
              productName: "$productName",
            },
            totalQuantity: { $sum: "$quantity" },
          },
        });
        bestPipeline.push({ $sort: { "_id.date": 1, totalQuantity: -1 } });
        bestPipeline.push({
          $group: {
            _id: "$_id.date",
            bestSellingProduct: { $first: "$_id.productName" },
            bestSellingQuantity: { $first: "$totalQuantity" },
          },
        });
        bestSelling = await Order.aggregate(bestPipeline);
      }
      const bestSellingByDate = {};
      bestSelling.forEach((item) => {
        bestSellingByDate[item._id] = {
          bestSellingProduct: item.bestSellingProduct,
          bestSellingQuantity: item.bestSellingQuantity,
        };
      });

      salesTrends = dailySummary.map((summary) => {
        const date = summary._id;
        return {
          date,
          totalSales: summary.totalSales,
          orderCount: summary.orderCount,
          averageOrderValue: summary.orderCount
            ? summary.totalSales / summary.orderCount
            : 0,
          totalItems: summary.totalItems,
          bestSellingProduct: bestSellingByDate[date]
            ? bestSellingByDate[date].bestSellingProduct
            : "N/A",
          bestSellingQuantity: bestSellingByDate[date]
            ? bestSellingByDate[date].bestSellingQuantity
            : 0,
        };
      });
    } else {
      const pipelineProduct = [];
      if (Object.keys(match).length > 0) {
        pipelineProduct.push({ $match: match });
      }
      pipelineProduct.push({ $unwind: "$items" });
      pipelineProduct.push({
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "productInfo",
        },
      });
      pipelineProduct.push({ $unwind: "$productInfo" });
      pipelineProduct.push({
        $group: {
          _id: { product: "$items.product", name: "$productInfo.name" },
          totalSales: {
            $sum: { $multiply: ["$items.price", "$items.quantity"] },
          },
          totalQuantity: { $sum: "$items.quantity" },
          orders: { $addToSet: "$_id" },
        },
      });
      pipelineProduct.push({
        $project: {
          product: "$_id.product",
          name: "$_id.name",
          totalSales: 1,
          totalQuantity: 1,
          orderCount: { $size: "$orders" },
        },
      });
      pipelineProduct.push({ $sort: { totalSales: -1 } });
      salesTrends = await Order.aggregate(pipelineProduct);
    }

    res.render("admin_sales", {
      salesTrends,
      viewType: selectedView,
      startDate: startDate || "",
      endDate: endDate || "",
      includeBestSeller: includeBestSeller || "0",
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving detailed sales trends.");
  }
});

// Manage Products
router.get("/dashboard/products", requireAdmin, async (req, res) => {
  const { category, sort, minPrice, maxPrice, search } = req.query;
  let filter = {};

  if (category) {
    filter.category = category;
  }

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) {
      filter.price.$gte = parseFloat(minPrice);
    }
    if (maxPrice) {
      filter.price.$lte = parseFloat(maxPrice);
    }
  }

  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }

  try {
    let products = await Product.find(filter);

    if (sort === "price_asc") {
      products.sort((a, b) => a.price - b.price);
    } else if (sort === "price_desc") {
      products.sort((a, b) => b.price - a.price);
    } else if (sort === "name_asc") {
      products.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "name_desc") {
      products.sort((a, b) => b.name.localeCompare(a.name));
    }

    const categories = await Product.distinct("category", {
      category: { $ne: null },
    });
    res.render("admin_products", {
      products,
      categories,
      filterParams: req.query,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving products.");
  }
});

router.get("/dashboard/products/new", requireAdmin, (req, res) => {
  res.render("admin_product_form", { product: {} });
});

router.post("/dashboard/products/new", requireAdmin, async (req, res) => {
  const { name, category, price, inventory, description } = req.body;
  try {
    const newProduct = new Product({
      name,
      category,
      price,
      inventory,
      description,
    });
    await newProduct.save();
    res.redirect("/admin/dashboard");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error adding product.");
  }
});

router.get("/dashboard/products/edit/:id", requireAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    res.render("admin_product_form", { product });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading product.");
  }
});

router.post("/dashboard/products/edit/:id", requireAdmin, async (req, res) => {
  const { name, category, price, inventory, description } = req.body;
  try {
    await Product.findByIdAndUpdate(req.params.id, {
      name,
      category,
      price,
      inventory,
      description,
    });
    res.redirect("/admin/dashboard");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating product.");
  }
});

// Users Management
router.get("/dashboard/users", requireAdmin, async (req, res) => {
  try {
    const users = await User.find({});
    res.render("admin_users", { users });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving users.");
  }
});

router.post(
  "/dashboard/users/update/:userId",
  requireAdmin,
  async (req, res) => {
    const { isAdmin } = req.body;
    try {
      await User.findByIdAndUpdate(req.params.userId, {
        isAdmin: isAdmin === "true",
      });
      res.redirect("/admin/dashboard/users");
    } catch (err) {
      console.error(err);
      res.status(500).send("Error updating user status.");
    }
  }
);

// Orders
router.get("/dashboard/orders", requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate("user")
      .populate("items.product")
      .sort({ createdAt: -1 });
    res.render("admin_orders", { orders });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving orders.");
  }
});

router.post(
  "/dashboard/orders/update/:orderId",
  requireAdmin,
  async (req, res) => {
    const { status } = req.body;
    if (!["pending", "approved", "declined"].includes(status)) {
      return res.status(400).send("Invalid status.");
    }
    try {
      await Order.findByIdAndUpdate(req.params.orderId, { status });
      res.redirect("/admin/dashboard/orders");
    } catch (err) {
      console.error(err);
      res.status(500).send("Error updating order status.");
    }
  }
);

// Delete a product
router.post(
  "/dashboard/products/delete/:id",
  requireAdmin,
  async (req, res) => {
    const productId = req.params.id;
    try {
      const ordersUsingProduct = await Order.find({
        "items.product": productId,
      });
      if (ordersUsingProduct.length > 0) {
        console.warn(
          "Warning: Deleting product that is referenced in orders. Orders will rely on stored product details."
        );
      }
      await Product.findByIdAndDelete(productId);
      res.redirect("/admin/dashboard/products");
    } catch (err) {
      console.error(err);
      res.status(500).send("Error deleting product.");
    }
  }
);

// Delete an order
router.post("/dashboard/orders/delete/:id", requireAdmin, async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.redirect("/admin/dashboard/orders");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting order.");
  }
});

module.exports = router;
