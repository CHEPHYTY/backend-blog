import { Router } from "express";
import mongoose from "mongoose";


import {
    allLatestBlogsCount,
    createBlog,
    getUploadUrlForTitleImage,
    latestBlogs,
    searchBlog,
    searchBlogCount,
    trendingBlogs
} from "../controllers/blog.controller.js";
import verifyJWT from "../middlewares/auth.middlewares.js";

const router = Router()


router.route("/get-upload-url").get(getUploadUrlForTitleImage)
router.route("/create-blog").post(verifyJWT, createBlog)
router.route("/latest-blogs").post(latestBlogs)
// router.route("/latest-blogs").get(latestBlogs)
router.route("/trending-blogs").get(trendingBlogs)


router.route("/search-blogs").post(searchBlog)

router.route("/all-latest-blogs-count").post(allLatestBlogsCount)

router.route("/search-blogs-count").post(searchBlogCount)

export default router;