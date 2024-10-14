import { Router } from "express";
import mongoose from "mongoose";

import {
    loginUser,
    registerUser,
    googleAuthentication
}
    from "../controllers/user.controller.js";
const router = Router();


router.route("/signup").post(registerUser);
router.route("/signin").post(loginUser);
router.route("/google-auth").post(googleAuthentication);
// router.


// secured routes

export default router;