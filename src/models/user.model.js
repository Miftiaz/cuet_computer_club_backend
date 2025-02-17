import mongoose, {Schema} from "mongoose"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

const userSchema = new Schema(
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
        department: {
            type: String,
            required: true
        },
        studentId: {
            type: String,
            required: true,
            unique: true
        },
        avatar: {
            type: String
        },
        codeforcesId: {
            type: String,
            required: true,
            unique: true
        },
        contentList: [
            {
                type: Schema.Types.ObjectId,
                ref: "Content"
            }
        ],
        password: {
            type: String,
            required: [true, "Password is required"]
        },
        role: { 
            type: String, 
            enum: ["user", "admin"], 
            default: "user" 
        },
        refreshTokens: {
            type: String,
        }
    }, { timestamps: true}
)

userSchema.pre("save", async function (next) {
    if(!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10)
    next()
})


userSchema.methods.isPasswordCorrect = async function (password){
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            studentId: this.studentId,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User", userSchema)