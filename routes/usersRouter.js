const express = require("express");
const router = express.Router();
const userModels = require("../models/user-models")


router.get("/", function(req, res){
    res.send("hey it is user route");
});

router.post("/register", async function(req, res){
    try {
        let { fullname, password, email } = req.body;

        let user = await userModels.create({
            fullname,
            email,
            password, // This now matches the schema field name
        });

        res.send(user);
        console.log(user)
    } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).send("Internal Server Error");
    }
});


module.exports = router;
