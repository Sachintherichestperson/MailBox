const express = require("express");
const router = express.Router();
const { registerUser, loginUser, logout,} = require("../controller/authcontroller")

router.get("/", function(req, res){
    res.send("hey it is user route");
});

router.post("/register", registerUser)

router.post("/login", loginUser)

router.get("/logout", logout)

module.exports = router;