import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Application } from "../models/applications.model.js";
import {ApiResponse} from '../utils/ApiResponse.js';
import {User} from '../models/user.model.js';
import dotenv from "dotenv"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import bcrypt from "bcrypt"
import nodemailer from "nodemailer"


dotenv.config({
    path: './.env'
})

export const createAdmin = asyncHandler(async (req, res) => {
    const { fullName, email, password, session, department, studentId, codeforcesId} = req.body;

    const existingUser = await User.findOne({ studentId });
    if (existingUser) {
        return res.status(400).json(new ApiResponse(400, [], "Admin with this email already exists"));
    }

    const adminUser = new User({
        fullName, 
        email,
        session, 
        department, 
        studentId, 
        codeforcesId,
        password: password,
        role: "admin", 
    });

    await adminUser.save();

    res.status(201).json(new ApiResponse(201, adminUser, "Admin created successfully!"));
});


export const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
})

//process application
export const processApplication = asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
    }

    const application = await Application.findOne({studentId});
    if (!application) {
        return res.status(404).json({ message: "Application not found" });
    }

    if (status === "approved") {
        const password = Math.random().toString(36).slice(-8);

        const newUser = new User({
            fullName: application.fullName,
            email: application.email,
            password,
            role: "user",
            codeforcesId: application.codeforcesId,
            session: application.session,
            department: application.department,
            studentId: application.studentId,
        });
        
        await newUser.save();

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: application.email,
            subject: "Membership Approved - CUET Computer Club",
            text: `Dear ${application.fullName},\n\nYour membership application has been approved!\n\nYou can now log in using the following credentials:\n\nEmail: ${application.email}\nPassword: ${password}\n\nPlease change your password after logging in.\n\nBest Regards,\nCUET Computer Club`,
        };

        await transporter.sendMail(mailOptions);
    }

    await Application.findByIdAndDelete(application._id);

    res.status(200).json({ message: `Application ${status} successfully` });
});

export const generateAccessAndRefreshTokens = async (userId) => {
    try{
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}
    } catch (error){
        throw new ApiError(500, "Something went wrong while generating tokens")
    }
}

export const applyForMemberShip = asyncHandler(async (req, res) => {
    const {email, studentId, fullName, session, department, codeforcesId} = req.body
    if (
        [email, studentId, fullName, session, department, codeforcesId].some((field) => 
        field?.trim() === "")
    ){
        throw new ApiError(400, "Please fill in all fields")
    }

    const existedApplication = await Application.findOne({
        $or: [
            {studentId},
            {email}
        ]
    })

    if (existedApplication){
        throw new ApiError(409, "Already applied for membership! You will be contacted soon!")
    }

    const existedUser = await User.findOne({
        $or: [
            {studentId},
            {email}
        ]
    })

    if (existedUser){
        throw new ApiError(409, "Already a member! You can't apply for membership!")
    }

    const application = await Application.create({
        email, 
        studentId, 
        fullName, 
        session, 
        department,
        codeforcesId
    })

    const createdApplication = await Application.findById(application._id)

    if (!createdApplication){
        throw new ApiError(500, "Application failed! Try again!")
    }

    return res.status(201).json(
        new ApiResponse (200, createdApplication, "Application submitted successfully!")
    )
})

export const getAllApplications = async (req, res) => {
    const applications = await Application.find().sort({ createdAt: 1 });

    if (!applications) {
        throw new ApiError(404, "No applications found");
    }

    return res
    .status(200)
    .json(applications)
}

//login
export const loginUser = asyncHandler(async (req, res) => {
    const {studentId, email, password} = req.body

    if (!studentId && !email){
        throw new ApiError(400, "Please provide username or email")
    }

    if (!password){
        throw new ApiError(400, "Please provide password")
    }

    const user = await User.findOne({
        $or: [
            {studentId},
            {email}
        ]
    })

    if(!user){
        throw new ApiError(404, "User not found")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid){
        throw new ApiError(401, "Invalid credentials")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshTokens")

    const options ={
        httpOnly: true,
        secure: true
    }

    return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser,
                accessToken,
                refreshToken
            },
            "User logged in successfully"
        )
    )

})

//refresh token
export const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken) {
        throw new ApiError (401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id)
    
        if(!user) {
            throw new ApiError (401, "unauthorized request")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError (401, "Refresh Token is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken)
        .cookie("refreshToken", newRefreshToken)
        .josn(
            new ApiResponse(
                200,
                {accessToken, newRefreshToken},
                "Access token refreshed successfully!"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token")
    }
})

//logout
export const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id, 
        {
            $set: {
                refreshTokens: undefined
            }
        },
        {
        new: true
        }
    )

    const options ={
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(200, {}, "User logged out successfully"))
})

export const changeCurrentPassword = asyncHandler(async (req, res) => {
    const {oldPassword, newPassword} = req.body
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect) {
        throw new ApiError(400, "Invalid Old Password!")
    }

    user.password = newPassword
    await user.save()

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed Successfully!"))
})

export const getCurrentUser = asyncHandler(async (req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current User fetched Successfully!"))
})

export const updateUserAvatar = asyncHandler(async (req, res) => {
    
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError (400, "Avatar file is missing!")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    
    if(!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")
    }

    const user = await User.findById(req.user?._id)

    if(!user) {
        throw new ApiError(401, "No user found!")
    }

    if(user.avatar){
        await deleteFromCloudinary(user.avatar)
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse (200, updatedUser, "Avatar Updated Successfully!"))
})

export const getUserProfile = asyncHandler( async (req, res) => {
    const {studentId} = req.params
    if(!studentId?.trim) {
        throw new ApiError(400, "ID is missing!")
    }

    const profile = await User.aggregate([
        {
            $match: {
                studentId
            }
        },
        {
            $lookup: {
                from: "contents",
                localField: "_id",
                foreignField: "author",
                as: "blogs"
            }
        },
        {
            $addFields: {
                blogsCount: {
                    $size: "$blogs"
                }
            }
        },
        {
            $project: {
                fullName: 1,
                studentId: 1,
                blogsCount: 1,
                avatar: 1,
                session: 1,
                department: 1
            }
        }
    ])

    if(!profile?.length){
        throw new ApiError(404, "Member does not exist!")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, profile[0], "User profile fetched successfully!")
    )
})

export const getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find().select("-password")
    return res
    .status(200)
    .json(new ApiResponse(200, users, "All users fetched successfully!"))
})

