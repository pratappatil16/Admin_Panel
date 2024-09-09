const express=require("express")
const app=express()
const mongoose = require('mongoose');
const routerAuth = require("./Authentication");
const cookieParser=require("cookie-parser");
const routerManagement = require("./Management");
const { configDotenv } = require("dotenv");
configDotenv()
app.use(express.urlencoded({extended:true}))
app.use(express.json())
app.use(cookieParser());
app.use(routerAuth)
app.use(routerManagement)

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("Connected to database");
        app.listen(2000, () => {
            console.log("Server is running on port 2000");
        });
    })
    .catch((error) => {
        console.error("Failed to connect to database:", error);
    });
