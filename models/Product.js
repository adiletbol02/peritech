const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ProductSchema = new Schema({
  name: { type: String, required: true },
  category: { type: String },
  price: { type: Number, required: true },
  inventory: { type: Number, default: 0 },
  description: { type: String },
});

module.exports = mongoose.model("Product", ProductSchema);
