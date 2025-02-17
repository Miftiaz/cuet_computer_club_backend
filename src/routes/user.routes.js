import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    loginUser,
    updateUserAvatar,
    changeCurrentPassword,
    getCurrentUser,
    logoutUser,
    getUserProfile,
    refreshAccessToken,
    applyForMemberShip,
    generateAccessAndRefreshTokens
} from "../controllers/user.controller.js"
import {guestMiddleware} from "../middlewares/auth.middleware.js"
import {
    getApprovedContent,
    getContent,
    getTeamMembers,
    getGalleryImages,
    uploadContent
} from "../controllers/content.controller.js"


const router = Router();

router.route("/login").post(loginUser);
router.route("/applyForMembership").post(guestMiddleware, applyForMemberShip);
router.route("/refreshToken").post(refreshAccessToken);
router.route("/generateTokens").post(generateAccessAndRefreshTokens);

router.route("/currentUser").get(verifyJWT, getCurrentUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/profile/:studentId").get(verifyJWT, getUserProfile);
router.route("/updateAvatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar);
router.route("/changePassword").patch(verifyJWT, changeCurrentPassword);

router.route("/content").get(getApprovedContent);
router.route("/content/:id").get(getContent);
router.route("/team").get(getTeamMembers);
router.route("/gallery").get(getGalleryImages);
router.route("/uploadContent").post(
    verifyJWT, 
    upload.single("coverImage"), 
    uploadContent
);

export default router;

