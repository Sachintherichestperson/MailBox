const express = require("express");
const router = express.Router();
const Product = require("../models/product-models"); // Assuming you have a Product model

router.get("/", async function(req, res) {
    try {
        // Fetch products from your database
        const products = await Product.find(); // Adjust based on your model and query
        res.render("shop", { products }); // Pass products to the view
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send("Internal Server Error");
    }
});

module.exports = router;
