import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import { IAdmin, AdminModel } from "./admin.interface";
import { ADMIN_ROLES, USER_STATUS } from "../../../enum/user";
import ApiError from "../../../errors/ApiError";
import { StatusCodes } from "http-status-codes";
import config from "../../../config";

const AdminSchema = new Schema<IAdmin, AdminModel>(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
            select: false,
        },
        firstName: {
            type: String,
            required: true,
        },
        lastName: {
            type: String,
            required: true,
        },
        contactNumber: {
            type: String,
            default: "",
        },
        phone: {
            type: String,
            default: "",
        },
        image: {
            type: String,
            default: "",
        },
        status: {
            type: String,
            enum: Object.values(USER_STATUS),
            default: USER_STATUS.ACTIVE,
        },
        verified: {
            type: Boolean,
            default: true,
        },
        role: {
            type: String,
            enum: Object.values(ADMIN_ROLES),
            default: ADMIN_ROLES.ADMIN,
        },
        authentication: {
            restrictionLeftAt: { type: Date, default: null },
            resetPassword: { type: Boolean, default: false },
            wrongLoginAttempts: { type: Number, default: 0 },
            passwordChangedAt: Date,
            oneTimeCode: { type: String, default: "" },
            latestRequestAt: { type: Date, default: Date.now },
            expiresAt: Date,
            requestCount: { type: Number, default: 0 },
            authType: { type: String },
        },
        deviceToken: { type: String, default: "" },
        fcmToken: { type: String, default: "" },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

AdminSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

AdminSchema.statics.isPasswordMatched = async function (
    givenPassword: string,
    savedPassword: string
) {
    return bcrypt.compare(givenPassword, savedPassword);
};

AdminSchema.pre("save", async function (next) {
    try {
        if (this.isModified("email")) {
            const isExist = await Admin.findOne({
                email: this.email,
                status: { $in: [USER_STATUS.ACTIVE, USER_STATUS.RESTRICTED] },
                _id: { $ne: this._id },
            });

            if (isExist) {
                return next(
                    new ApiError(
                        StatusCodes.BAD_REQUEST,
                        "An admin account with this email already exists"
                    )
                );
            }
        }
        if (this.isModified("password")) {
            this.password = await bcrypt.hash(
                this.password,
                Number(config.bcrypt_salt_rounds)
            );
        }
        next();
    } catch (error) {
        next(error as Error);
    }
});

export const Admin = mongoose.model<IAdmin, AdminModel>("Admin", AdminSchema);
