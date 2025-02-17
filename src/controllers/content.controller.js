import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from '../utils/ApiResponse.js';
import { Content } from "../models/content.model.js";
import { Image } from "../models/images.model.js";
import {Team} from "../models/teams.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

export const getAllContent = asyncHandler(async (req, res) => {
    const allContent = await Content.find().sort({ createdAt: -1 });

    if (!allContent.length) {
        return res.status(404).json(new ApiResponse(404, [], "No content found."));
    }

    res.status(200).json(new ApiResponse(200, allContent, "All content fetched successfully!"));
});

export const getApprovedContent = asyncHandler(async (req, res) => {
    const approvedContent = await Content.find({ isApproved: true }).sort({ createdAt: -1 });

    if (!approvedContent.length) {
        return res.status(404).json(new ApiResponse(404, [], "No content found."));
    }

    res.status(200).json(new ApiResponse(200, approvedContent, "Approved content fetched successfully!"));
});

export const getContent = asyncHandler(async (req, res, next) => {
  const content = await Content.findById(req.params.id);
  if (!content) {
     return next(new ApiError(404, "Content not found"));
  }
  return res.status(200).json(new ApiResponse(200, content));
})

export const getTeamMembers = asyncHandler(async (req, res) => {
    const { isEC, isAlumni, team } = req.body;

    let filter = {};

    if (isEC !== undefined) filter.isEC = isEC === "true";
    if (isAlumni !== undefined) filter.isAlumni = isAlumni === "true";
    if (team !== undefined) filter.team = team; 

    console.log(filter)

    const teamMembers = await Team.find(filter).sort({ createdAt: -1 });

    if (!teamMembers.length) {
        return res.status(404).json({ message: "No matching team members found" });
    }

    res.status(200).json(teamMembers);
});


export const uploadImages = asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json(new ApiResponse(400, [], "No images provided"));
    }

    const { altTexts } = req.body; // Expecting an array of alt texts (one for each image)

    if (!altTexts || !Array.isArray(altTexts) || altTexts.length !== req.files.length) {
        return res.status(400).json(new ApiResponse(400, [], "Invalid or missing alt text array"));
    }

    try {
        // Upload all images to Cloudinary
        const uploadedImages = await Promise.all(
            req.files.map(async (file, index) => {
                try {
                    const result = await uploadOnCloudinary(file.path);
                    return { img: result.secure_url, altText: altTexts[index] };
                } catch (error) {
                    console.error("Image upload failed:", error);
                    return null; // Handle individual file failures
                }
            })
        );

        // Remove any failed uploads (null values)
        const validImages = uploadedImages.filter((image) => image !== null);

        if (validImages.length === 0) {
            return res.status(500).json(new ApiResponse(500, [], "All image uploads failed"));
        }

        // Save images to MongoDB
        const savedImages = await Image.insertMany(validImages);

        return res.status(201).json(new ApiResponse(201, savedImages, "Images uploaded and saved successfully!"));
    } catch (error) {
        console.error("Bulk Image Upload Error:", error);
        return res.status(500).json(new ApiResponse(500, [], "Internal Server Error"));
    }
});

export const getGalleryImages = asyncHandler(async (req, res) => {
    const images = await Image.find().sort({ createdAt: -1 }); // Newest first
    res.status(200).json(images);
});

export const uploadContent = asyncHandler(async (req, res) => {
    const { heading, details } = req.body;

    if (!heading || !details || !req.file) {
        return res.status(400).json(new ApiResponse(400, [], "All fields are required, including the cover image."));
    }

    try {
        // Upload cover image to Cloudinary
        const result = await uploadOnCloudinary(req.file.path);
        const coverImageUrl = result.secure_url; // Get Cloudinary URL

        // Save content to MongoDB
        const newContent = new Content({
            heading,
            author: req.user._id, // Get user from JWT authentication
            details,
            coverImage: coverImageUrl
        });

        await newContent.save();

        return res.status(201).json(new ApiResponse(201, newContent, "Content uploaded successfully!"));
    } catch (error) {
        console.error("Content Upload Error:", error);
        return res.status(500).json(new ApiResponse(500, [], "Internal Server Error"));
    }
});

export const uploadTeamMember = asyncHandler(async (req, res) => {
    const { fullName, position, session, isAlumni, isEC, team } = req.body;

    if (!fullName || !session || !req.file) {
        return res.status(400).json(new ApiResponse(400, [], "All fields are required, including the avatar."));
    }

    try {
        // Upload avatar image to Cloudinary
        const result = await uploadOnCloudinary(req.file.path);
        const avatarUrl = result.secure_url; // Get Cloudinary URL

        // Save team member details in MongoDB
        const newTeamMember = new Team({
            fullName,
            position,
            session,
            isAlumni: isAlumni === "true",
            isEC: isEC === "true",
            team,
            avatar: avatarUrl,
        });

        await newTeamMember.save();

        return res.status(201).json(new ApiResponse(201, newTeamMember, "Team member added successfully!"));
    } catch (error) {
        console.error("Team Member Upload Error:", error);
        return res.status(500).json(new ApiResponse(500, [], "Internal Server Error"));
    }
});

export const processContent = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { action } = req.body;

    const content = await Content.findById(id);
    if (!content) {
        return next(new ApiError(404, "Content not found"));
    }

    if (action === "approve" && content.isApproved) {
        return res.status(400).json(new ApiResponse(400, [], "Content is already approved"));
    }

    if (action === "reject") {
        await Content.findByIdAndDelete(id);
        return res.status(201).json(new ApiResponse(201, [], "Content is deleted successfully"));
    }

    content.isApproved = true;
    await content.save();

    res.status(200).json(new ApiResponse(200, content, "Content approved successfully!"));
});

export const editTeamMember = asyncHandler(async (req, res) => {
    const { fullName, position, session, isAlumni, isEC, team } = req.body;

    const teamMember = await Team.findById(req.params.id);
    if (!teamMember) {
        return res.status(404).json(new ApiResponse(404, [], "Team member not found"));
    }

    teamMember.fullName = fullName;
    teamMember.position = position;
    teamMember.session = session;
    teamMember.isAlumni = isAlumni === "true";
    teamMember.isEC = isEC === "true";
    teamMember.team = team;

    await teamMember.save();

    return res.status(200).json(new ApiResponse(200, teamMember, "Team member updated successfully!"));
});

export const deleteContent = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    const content = await Content.findById(id);
    if (!content) {
        return next(new ApiError(404, "Content not found"));
    }

    await Content.findByIdAndDelete(id);

    res.status(200).json(new ApiResponse(200, null, "Content deleted successfully!"));
});