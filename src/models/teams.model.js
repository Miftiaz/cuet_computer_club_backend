import mongoose, {Schema} from "mongoose";

const teamSchema = new Schema(
    {
        fullName: {
            type: String,
            unique: true,
            required: true
        },
        position: {
            type: String,
            unique: true
        },
        avatar: {
            type: String,
            required: true
        },
        session: {
            type: String,
            required: true
        },
        isAlumni: {
            type: Boolean,
            default: false,
            required: true
        },
        isEC:{
            type: Boolean,
            default: false,
            required: true
        },
        team:{
            type: String,
            enum: ["Development", "Graphics", "Management", "Content"],
        }
    }, { timestamps: true}
)

export const Team = mongoose.model("Team", teamSchema)