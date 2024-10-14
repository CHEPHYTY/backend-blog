import { Router } from "express";
import mongoose from "mongoose";


import { getUploadUrlForTitleImage }
    from "../controllers/blog.controller.js";

const router = Router()


router.route("/get-upload-url").get(getUploadUrlForTitleImage)


export default router