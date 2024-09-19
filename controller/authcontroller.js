const userModels = require("../models/user-models")
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken")
const {generatetoken} = require("../utilis/generatetoken")

module.exports.registerUser = function (req, res){
        try {
            let { fullname, Password, email } = req.body;
    
            bcrypt.genSalt(10, (err, salt) => {
                if (err) return res.send(err.message);
                bcrypt.hash(Password, salt, async function(err, hash){
                    if(err) return res.send(err.message);
                    else{
                        let user = await userModels.create({
                            fullname,
                            email,
                            Password: hash, 
                        });
                      let token = generatetoken(user)
                       res.cookie("token", token)
                       res.send("user created successfully")
                    }
                })
            })
        } 
        catch (error) {
            console.log("Error creating user:", error);
            res.status(500).send("Internal Server Error");
        };
    };