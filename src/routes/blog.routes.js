import { Router } from "express";
import mongoose from "mongoose";


import {
    createBlog,
     getUploadUrlForTitleImage
} from "../controllers/blog.controller.js";
import verifyJWT from "../middlewares/auth.middlewares.js";

const router = Router()


router.route("/get-upload-url").get(getUploadUrlForTitleImage)
router.route("/create-blog").post(verifyJWT, createBlog)


export default router;