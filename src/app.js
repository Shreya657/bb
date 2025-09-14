import express from "express"
import cors from "cors"
import path from "path"
import cookieParser from "cookie-parser"
import { fileURLToPath } from "url"
const app=express()
app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))
app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true,limit:"16kb"}))
app.use(express.static("public"))

app.use(cookieParser())


import userRouter from './routes/user.routes.js'
import disasterRouter from './routes/disaster.routes.js'


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from public folder
// app.use(express.static(path.join(__dirname, "public")));

app.use("/api/v1/users",userRouter)
app.use("/api/v1/disaster",disasterRouter)


//  http://localhost:3000/api/v1/users/register


export {app}
