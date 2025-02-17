import {ApiError} from '../utils/ApiError.js';
import jwt from 'jsonwebtoken';
import {User} from '../models/user.model.js';
import {asyncHandler} from '../utils/asyncHandler.js';

export const verifyJWT = asyncHandler (async (req, _, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        if (!token){
            throw new ApiError(401, "Unauthorized")
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id).select("-password -refreshTokens")
    
        if (!user){
            throw new ApiError(401, "Invalid Access Token")
        }
    
        req.user = user;
        next()
    } catch (error) {
        throw new ApiError(401, error?.message || "Unauthorized")
    }

})

export const isAdmin = asyncHandler(async (req, res, next) => {
    try {
        if (!req.user) {
            throw new ApiError(401, "Unauthorized - No user found");
        }
    
        if (req.user.role !== "admin") {
            throw new ApiError(403, "Access denied - Admins only");
        }
    
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Unauthorized")
    }
});

export const guestMiddleware = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (token) {
            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

            return res.status(403).json({ message: "Invalid access" });
        }
        next();
    } catch (error) {
        next();
    }
};