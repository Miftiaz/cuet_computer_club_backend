import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import userRouter from "./routes/user.routes.js"
import adminRouter from "./routes/admin.routes.js"
import { createAdmin } from "./controllers/user.controller.js"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials:true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
}))

app.use(express.json({
    limit: "16kb"
}))

app.use(express.urlencoded({
    extended: true,
    limit: "16kb"
}))

app.use(express.static("public"))

app.use(cookieParser())

app.use("/api/v1/user", userRouter)

app.use("/api/v1/admin", adminRouter)

app.use("/api/v1/adminCreate", createAdmin)




export {app}