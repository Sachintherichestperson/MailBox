const express = require("express");
const router = express.Router();
const { registerUser } = require("../controller/authcontroller")

router.get("/", function(req, res){
    res.send("hey it is user route");
});

router.post("/register", registerUser)


module.exports = router;
