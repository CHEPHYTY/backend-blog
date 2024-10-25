import { Router } from "express";
import mongoose from "mongoose";

import {
    loginUser,
    registerUser,
    googleAuthentication,
    searchUser,
    getProfile
}
    from "../controllers/user.controller.js";
const router = Router();


router.route("/signup").post(registerUser);
router.route("/signin").post(loginUser);
router.route("/google-auth").post(googleAuthentication);

router.route("/search-users").post(searchUser)

router.route("/get-profile").post(getProfile)
// router.


// secured routes

export default router;