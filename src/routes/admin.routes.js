import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { 
    generateAccessAndRefreshTokens,
    getAllUsers,
    getCurrentUser,
    getUserProfile,
    loginUser,
    logoutUser,
    refreshAccessToken,
    processApplication,
    getAllApplications
 } from "../controllers/user.controller.js";
import { 
    getAllContent,
    getTeamMembers,
    uploadImages,
    uploadTeamMember,
    processContent,
    editTeamMember,
    deleteContent
 } from "../controllers/content.controller.js";
import {verifyJWT, isAdmin} from '../middlewares/auth.middleware.js';

const router = Router();


router.route("/login").post(loginUser);
router.route("/generateTokens").post(generateAccessAndRefreshTokens);
router.route("/users").get(verifyJWT, isAdmin, getAllUsers);
router.route("/currentUser").get(verifyJWT, isAdmin, getCurrentUser);
router.route("/profile/:id").get(verifyJWT, isAdmin, getUserProfile);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refreshToken").post(refreshAccessToken);
router.route("/applications").get(verifyJWT, isAdmin, getAllApplications);
router.route("/applications/:studentId").patch(verifyJWT, isAdmin, processApplication);

router.route("/content").get(verifyJWT, isAdmin, getAllContent);
router.route("/content/:id/processContent").patch(verifyJWT, isAdmin, processContent);
router.route("/content/delete/:id").delete(verifyJWT, isAdmin, deleteContent);

router.route("/team").get(verifyJWT, isAdmin, getTeamMembers);
router.route("/team/:id").patch(verifyJWT, isAdmin, editTeamMember);
router.route("/team/upload").post(verifyJWT, isAdmin, upload.single("avatar"), uploadTeamMember);

router.route("/images/upload").post(verifyJWT, isAdmin, upload.array("img"), uploadImages);
export default router;