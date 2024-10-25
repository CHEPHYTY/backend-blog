import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import bcrypt from 'bcryptjs';
import mongoose from "mongoose";

import admin from 'firebase-admin';
import serviceAccount from '../../react-js-blog-website-soumya-firebase-adminsdk-zdyxc-11b46d843a.json' assert { type: 'json' };
import { getAuth } from 'firebase-admin/auth';  // Correct subpath
import { refreshToken } from "firebase-admin/app";


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



const checkUserExistence = async (username = "", email = "") => {
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



admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


/*
const googleAuthentication = asyncHandler(async (req, res) => {
    let { accessToken } = req.body;


    getAuth()
        .verifyIdToken(accessToken)
        .then(async (decodedUser) => {
            let { email, name, photoURL, stsTokenManager } = decodedUser;

            userPicture = photoURL.replace("s96-c", "s384-c");


            // const exist = await checkUserExistence(, email)

            let user = await User.findOne({ "personal_info.email": email }).select("personal_info.fullname personal_info.username personal_info.profile_img google_auth")
                .then((u) => {
                    return u || null
                })
                .catch((err) => {
                    // return ApiError(500,"")
                    return res.status(500).json({ "error": err.message })
                })

            if (user) {
                //sign in
                if (!user.google_auth) {
                    return res.status(403).json({ "error": "This email was signed up without google. Please log in with password to access the account." })
                }
            }
            else {
                //sign up
                let username = name.slice(0, 15);
                user = new User({
                    personal_info: {
                        fullname: name,
                        email: email,
                        profile_img: userPicture,

                    },
                    google_auth: true,
                })

                user.save()

                    .then((u) => {
                        user = u;
                    })
                    .catch((err) => {
                        return res.status(500).json({ "error": err.message })
                    })
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

            }


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
        })
                .catch((err)=>{
                    return res.status(500).json({"error":Failed to authenticate you wiht google. Try with another google account.})
                    })


})

*/



const googleAuthentication = asyncHandler(async (req, res) => {
    let { accessToken } = req.body;

    try {
        // Verify the Google token using Firebase Admin SDK
        const decodedUser = await getAuth().verifyIdToken(accessToken);
        console.log("Decoded User:", decodedUser); // Log to inspect what you get from Google

        const { email, name, picture } = decodedUser;
        console.log("photoURL:", picture); // Log photoURL to check if it's undefined

        // Use a default image if photoURL is undefined
        const userPicture = picture ? picture.replace("s96-c", "s384-c") : 'default-profile-picture-url'; // Add a default picture URL here

        // Check if user already exists by email
        let user = await User.findOne({ "personal_info.email": email }).select("-personal_info.password -personal_info.refreshToken");

        if (user) {
            // If user exists but didn't use Google to sign up
            if (!user.google_auth) {
                throw new ApiError(403, "This email was signed up without Google. Please log in with a password to access the account.");
            }

            // If user exists and used Google, proceed with login and generate tokens
            const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

            // Set cookies and return success response
            const options = {
                httpOnly: true,
                secure: true,
            };

            return res
                .status(200)
                .cookie("accessToken", accessToken, options)
                .cookie("refreshToken", refreshToken, options)
                .json(new ApiResponse(200, { user: user.personal_info, accessToken, refreshToken }, "User logged in successfully"));
        } else {
            // If user doesn't exist, proceed with registration (sign up)
            const username = name.replace(/\s+/g, '').slice(0, 15); // Create a username from name

            user = new User({
                personal_info: {
                    fullname: name,
                    email: email,
                    username: username,
                    profile_img: userPicture,  // Use user picture or default
                    password: username.slice(0.10), // Add a placeholder password
                },
                google_auth: true, // Mark that this user used Google for authentication
            });

            // Hash the placeholder password before saving
            user.personal_info.password = await bcrypt.hash(user.personal_info.password, 16);

            // Save the new user to the database
            await user.save();

            // Generate access and refresh tokens
            const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

            // Fetch the created user without password and refresh token
            const createdUser = await User.findById(user._id).select("-personal_info.password -personal_info.refreshToken");

            if (!createdUser) {
                throw new ApiError(500, "Something went wrong while registering the user");
            }

            // Set cookies and return success response
            const options = {
                httpOnly: true,
                secure: true,
            };

            return res
                .status(201)
                .cookie("accessToken", accessToken, options)
                .cookie("refreshToken", refreshToken, options)
                .json(new ApiResponse(200, { user: createdUser.personal_info, accessToken, refreshToken }, "User Registered Successfully"));
        }
    } catch (error) {
        // Handle ApiError explicitly
        if (error instanceof ApiError) {
            console.error("Handled ApiError during Google authentication:", {
                message: error.message,
                statusCode: error.statusCode,
                errors: error.errors,
            });

            return res.status(error.statusCode).json({
                success: false,
                message: error.message,
                errors: error.errors || [],
            });
        }

        // Handle specific error cases like token issues or database failures
        if (error.name === "FirebaseAuthError") {
            console.error("Firebase Auth Error during Google authentication:", error);

            return res.status(401).json({
                success: false,
                message: "Invalid Google token. Please try again.",
            });
        } else if (error.name === "ValidationError") {
            console.error("Validation Error during Google authentication:", error);

            return res.status(400).json({
                success: false,
                message: "Validation failed. Check the provided data.",
                errors: error.errors || [],
            });
        }

        // Handle unexpected errors
        console.error("Unexpected Error during Google authentication:", {
            message: error.message,
            stack: error.stack,
        });

        return res.status(500).json({
            success: false,
            message: "Internal Server Error. Please try again later.",
        });
    }
});



const searchUser = asyncHandler(async (req, res) => {
    let { query } = req.body

    User.find({ "personal_info.username": new RegExp(query, 'i') })
        .limit(50)
        .select("personal_info.fullname personal_info.username personal_info.profile_img -_id")
        .then(users => {
            return res.status(200).json({ users })
        })
        .catch(err => {
            return res.status(500).json({ error: err.message })
        })
})



const getProfile = asyncHandler(async (req, res) => {

    let { username } = req.body;

    User.findOne({ "personal_info.username": username })
        .select("-personal_info.password -google_auth -updatedAt -blogs  ")
        .then(user => {
            return res.status(200).json(user)
        })
        .catch(err => {
            console.log(err);
            return res.status(500).json({ error: err.message })
        })
})
export {
    registerUser,
    loginUser,
    googleAuthentication,
    searchUser,
    getProfile
}