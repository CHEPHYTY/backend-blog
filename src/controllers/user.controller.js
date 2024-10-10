import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import bcrypt from 'bcryptjs';
import mongoose from "mongoose";


/**
 * @Functionality Generate Access and Refresh Tokens
 * @function
 * 1 -> generateAccessAndRefreshTokens(userId)
 */


const generateAccessAndRefreshTokens = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not Exist");
    }

    try {
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        // Store the refresh token in the user's document
        user.personal_info.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    }
    catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh tokens.");
    }
};






/**
 * @Functionality User Registration Function.
 * @functions
 * 1 -> registerUser()
 * 2 -> CheckUserExistence()
 */
const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const passwordRegex = /^(?=.{8,})((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/;

// const generateUserHashPasswordAndCheckUserExistence = async (password, username, email) => {



const checkUserExistence = async (username, email) => {
    const existedEmail = await User.findOne({ "personal_info.email": email });
    if (existedEmail) {
        throw new ApiError(403, "User with this email already exists");
    }

    const existedUsername = await User.findOne({ "personal_info.username": username });
    if (existedUsername) {
        throw new ApiError(403, "User with this username already exists");
    }

    return { username, email };
};



const registerUser = asyncHandler(async (req, res) => {
    const { fullname, email, username, password } = req.body;

    try {
        // Validate input fields
        if ([fullname, email, username, password].some(field => !field || field.trim() === "")) {
            throw new ApiError(403, "All fields are required");
        }

        if (fullname.length < 3) {
            throw new ApiError(403, "Fullname must be at least 3 characters long");
        }

        if (!emailRegex.test(email)) {
            throw new ApiError(403, "Enter a valid Email");
        }

        if (!passwordRegex.test(password)) {
            throw new ApiError(403, "Password must be at least 8 characters long, include one uppercase letter, one lowercase letter, and one number or special character.");
        }

        // Check username and email existence
        const result = await checkUserExistence(username, email);

        // Create the user
        const user = new User({
            personal_info: {
                fullname: fullname,
                email: result.email,
                password: password,
                username: result.username
            }
        });

        // Save the user
        await user.save();

        // Generate access and refresh tokens
        const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

        // Fetch the created user without the password and refresh token
        const createdUser = await User.findById(user._id).select("-personal_info.password -personal_info.refreshToken");

        if (!createdUser) {
            throw new ApiError(500, "Something went wrong while registering the user");
        }

        // Return successful registration response
        return res.status(201).json(new ApiResponse(200, {
            user: createdUser.personal_info,
            accessToken,
            refreshToken
        }, "User Registered Successfully"));

    } catch (error) {
        // Handle ApiError explicitly
        if (error instanceof ApiError) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message,
                errors: error.errors,
            });
        }

        // Handle unexpected errors
        console.error("Error registering user:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
});





/**
 * @Functionality User Login 
 * @functions
 * 1 -> loginUser()
 */


const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email) {
            throw new ApiError(400, "Email is required");
        }
        if (!emailRegex.test(email)) {
            throw new ApiError(403, "Enter a valid Email");
        }

        const user = await User.findOne({ "personal_info.email": email });

        if (!user) {
            throw new ApiError(404, "User does not exist");
        }

        const isPasswordValid = await user.isPasswordCorrect(password);

        if (!isPasswordValid) {
            throw new ApiError(401, "Invalid user credentials");
        }

        // Generate tokens
        const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

        // Update the refresh token in the database
        user.personal_info.refreshToken = refreshToken;
        await user.save();

        // Fetch user details without password and refreshToken
        const loggedInUser = await User.findById(user._id).select("-personal_info.password -personal_info.refreshToken -personal_info.bio");
        // const loggedInUser = await User.findById(user._id).select("-personal_info.password -personal_info.refreshToken -personal_info.bio -personal_info.profile_img");

        // const options = {
        //     httpOnly: true,
        //     secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        //     sameSite: 'Strict',
        //     path: '/',
        // };
        const options = {
            httpOnly: true,
            secure: true
        };

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { user: loggedInUser.personal_info, accessToken, refreshToken },
                    "User logged in successfully"
                )
            );
    } catch (error) {
        // Check if the error is an instance of ApiError and respond accordingly
        if (error instanceof ApiError) {
            return res.status(error.statusCode).json({
                success: error.success,
                message: error.message,
                errors: error.errors,
            });
        }

        // For any other unexpected errors, return a generic response
        console.error("Error logging in user:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
});



export {
    registerUser,
    loginUser
}