const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const path = require("path");
const index = require("./routes/index")
const ownersRouter = require("./routes/ownersRouter");
const usersRouter = require("./routes/usersRouter");
const productsRouter = require("./routes/productsRouter");
require("dotenv").config()
const db = require("./config/mongoose-connection")

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs")

app.use("/", index)
app.use("/owner", ownersRouter)
app.use("/user", usersRouter)
app.use("/product", productsRouter)

app.listen(3000)
