import mongoose, {Schema} from "mongoose";

const contentSchema = new Schema(
    {
        heading: {
            type: String,
            unique: true,
            required: true
        },
        author: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        details: {
            type: String,
            required: true
        },
        coverImage: {
            type: String,
            required: true
        },
        isApproved: {
            type: Boolean,
            default: false,
            required: true
        }
    }, { timestamps: true}
)

export const Content = mongoose.model("Content", contentSchema)