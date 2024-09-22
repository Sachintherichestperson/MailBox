const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const path = require("path");
const expressSession = require("express-session");
const flash = require("connect-flash")

require("dotenv").config()

const index = require("./routes/index")
const ownersRouter = require("./routes/ownersRouter");
const usersRouter = require("./routes/usersRouter");
const productsRouter = require("./routes/productsRouter");


const db = require("./config/mongoose-connection")

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());

app.use(expressSession({
    resave: false,
    saveUninitialized: false,
    secret: process.env.EXPRESS_SESSION_SECRET,
}));

app.use(flash());  // Must be used after express-session
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs")


app.use("/", index)
app.use("/owner", ownersRouter)
app.use("/user", usersRouter)
app.use("/product", productsRouter)


app.listen(4000)
