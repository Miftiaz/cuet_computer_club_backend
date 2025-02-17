import mongoose, {Schema} from "mongoose";

const applicationSchema = new Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        session: {
            type: String,
            required: true
        },
        codeforcesId: {
            type: String,
            required: true,
            unique: true
        },
        department: {
            type: String,
            required: true
        },
        studentId: {
            type: String,
            required: true,
        }
    }, { timestamps: true}
)

export const Application = mongoose.model("Application", applicationSchema)