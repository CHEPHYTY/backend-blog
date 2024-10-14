import express from "express";
import cors from "cors";
import cookieParser from 'cookie-parser';

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credential: true
}));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// routes import
import userRouter from "./routes/user.routes.js";
import blogRouter from "./routes/blog.routes.js";

// routes declaration

const ApiVersion = "/api/v1";

app.use(`${ApiVersion}/user`, userRouter)
app.use(`${ApiVersion}/blog`, blogRouter)


/**
 * url :
 */

export { app };
