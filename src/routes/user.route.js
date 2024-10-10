import { Router } from "express";
import mongoose from "mongoose";

import { loginUser, registerUser } from "../controllers/user.controller.js";
const router = Router();


router.route("/signup").post(registerUser);
router.route("/signin").post(loginUser);


// secured routes

export default router;