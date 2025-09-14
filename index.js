import dotenv from "dotenv"
import mongoose from "mongoose"
import { DB_NAME } from "./src/constants.js"; 
import connectDB from "./src/db/server.js";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { app } from "./src/app.js";

dotenv.config({
    path:'./.env'
})
connectDB()



.then(()=>{
    app.get('/',(req,res)=>{
        // Redirect to the disaster upload page
        res.redirect('/api/v1/disaster/upload');
    })
    app.listen(process.env.PORT||3000,()=>{
        console.log(`Server is running on port ${process.env.PORT}`);
        console.log(`Visit: http://localhost:${process.env.PORT || 3000}`);
        console.log(`Disaster Upload: http://localhost:${process.env.PORT || 3000}/api/v1/disaster/upload`);
    });
})         

.catch((err)=>{
    console.log("MONGODB CONNECTION FAILED!!!",err);

})













