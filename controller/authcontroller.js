const userModels = require("../models/user-models")
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken")
const {generatetoken} = require("../utilis/generatetoken")

module.exports.registerUser =async function (req, res){
        try {
            let { fullname, Password, email } = req.body;
     
            let user = await userModels.findOne({email: email});
            if(user) {
                req.flash("error", "user already registered")
                return res.redirect("/")
            } 


            bcrypt.genSalt(10, (err, salt) => {
                if (err) return res.send(err.message);
                bcrypt.hash(Password, salt, async function(err, hash){
                    if(err) {
                        req.flash("error", err.message)
                        return res.redirect("/")
                    }
                    else{
                        let user = await userModels.create({
                            fullname,
                            email,
                            Password: hash, 
                        });
                      let token = generatetoken(user)
                       res.cookie("token", token)
                       return res.redirect("/shop")
                    }
                })
            })
        } 
        catch (error) {
            console.log("Error creating user:", error);
            res.redirect("error", "Internal Server Error");
            res.redirect("/")
        };
    };


    module.exports.loginUser = async function (req, res){
        let {email, Password} = req.body;

        let user = await userModels.findOne({email: email});
        if(!user) {
            req.flash("error", "email incorrect")
            return res.redirect("/")
        }

        bcrypt.compare(Password, user.Password,async function(err, result){
            if(result) {
            let token = generatetoken(user);
            res.cookie("token", token);
           return res.redirect("/shop");
            }
            else{
                req.flash("error", "Incorrect Password")
               return res.redirect("/")
            }
        })
    }

    module.exports.logout = function(req, res){
        res.cookie("token", "");
        res.redirect("/")
    }