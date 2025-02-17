import mongoose, {Schema} from "mongoose";

const imageSchema = new Schema(
    {
        img: {
            type: String,
            required: true
        },
        altText: {
            type: String,
            required: true
        }
    }, { timestamps: true}
)

export const Image = mongoose.model("Image", imageSchema)