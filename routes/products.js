const express = require("express");
const router = express.Router();
const Product = require("../models/Product");

router.get("/", async (req, res) => {
  const { category, sort, minPrice, maxPrice, search } = req.query;
  let filter = { inventory: { $gt: 0 } };

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
    // Retrieve unique categories from the database
    const categories = await Product.distinct("category", {
      category: { $ne: null },
    });
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

    res.render("products", { products, categories, filterParams: req.query });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving products.");
  }
});

module.exports = router;
