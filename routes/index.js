const express = require("express");
const router = express.Router();
const isloggedin = require("../middleware/isloggedin")

router.get("/", function(req, res){
    let error = req.flash("error");
    res.render("index", {error});
});

router.use("/shop", isloggedin, require("./productsRouter"));

module.exports = router;