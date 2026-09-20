import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import { IUser, USER_ROLES, USER_STATUS, APPROVAL_STATUS, UserModel } from "./user.interface";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import config from "../../../config";

const UserSchema = new Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
        },
        password: {
            type: String,
            required: true,
        },
        image: {
            type: String,
            default: "",
        },
        firstName: {
            type: String,
            required: true,
        },
        lastName: {
            type: String,
            required: true,
        },
        username: {
            type: String,
            default: "",
        },
        contactNumber: {
            type: String,
            default: "",
        },
        phone: {
            type: String,
            default: "",
        },
        status: {
            type: String,
            enum: ["active", "restricted", "deleted"],
            default: "active",
        },
        verified: {
            type: Boolean,
            default: false,
        },
        role: {
            type: String,
            enum: Object.values(USER_ROLES),
            default: USER_ROLES.PROPERTY_MANAGER,
        },
        propertyManagerProfile: {
            type: {
                contactFullName: { type: String, trim: true },
                jobTitle: { type: String, trim: true },
                businessEmail: { type: String, trim: true },
                businessPhone: { type: String, trim: true },
                companyName: { type: String, trim: true },
                legalBusinessName: { type: String, trim: true },
                dbaTradeName: { type: String, trim: true },
                companyWebsiteUrl: { type: String, trim: true },
                businessAddress: { type: String, trim: true },
                city: { type: String, trim: true },
                state: { type: String, trim: true },
                taxId: { type: String, trim: true },
                portfolioSize: { type: String, trim: true },
                maintenanceInfrastructure: { type: String, trim: true },
                propertyTypes: [{ type: String, trim: true }],
                approvalStatus: {
                    type: String,
                    enum: Object.values(APPROVAL_STATUS),
                    default: APPROVAL_STATUS.PENDING,
                },
                rejectionReason: {
                    type: String,
                    default: "",
                },
            },
            default: undefined,
            _id: false,
        },
        authentication: {
            restrictionLeftAt: {
                type: Date,
                default: null,
            },
            resetPassword: {
                type: Boolean,
                default: false,
            },
            wrongLoginAttempts: {
                type: Number,
                default: 0,
            },
            passwordChangedAt: Date,
            oneTimeCode: {
                type: String,
                default: "",
            },
            latestRequestAt: {
                type: Date,
                default: Date.now,
            },
            expiresAt: Date,
            requestCount: {
                type: Number,
                default: 0,
            },
            authType: {
                type: String,
                enum: ['createAccount', 'resetPassword'],
            },
        },
        deviceToken: {
            type: String,
            default: "",
        },
        fcmToken: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: (doc, ret) => {
                if (ret.role === USER_ROLES.SERVICE_PROVIDER || !ret.propertyManagerProfile) {
                    delete ret.propertyManagerProfile;
                }
                return ret;
            }
        },
        toObject: {
            virtuals: true,
            transform: (doc, ret) => {
                if (ret.role === USER_ROLES.SERVICE_PROVIDER || !ret.propertyManagerProfile) {
                    delete ret.propertyManagerProfile;
                }
                return ret;
            }
        },
    }
);

UserSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

UserSchema.statics.isPasswordMatched = async function (
    givenPassword: string,
    savedPassword: string
) {
    return bcrypt.compare(givenPassword, savedPassword);
};

UserSchema.pre("save", async function (next) {
    try {
        if (this.role === USER_ROLES.SERVICE_PROVIDER) {
            this.propertyManagerProfile = undefined;
        } else if (this.role === USER_ROLES.PROPERTY_MANAGER && this.propertyManagerProfile) {
            if (!this.propertyManagerProfile.approvalStatus) {
                this.propertyManagerProfile.approvalStatus = APPROVAL_STATUS.PENDING;
            }
        }

        if (this.isModified("email")) {
            const isExist = await User.findOne({
                email: this.email,
                status: { $in: [USER_STATUS.ACTIVE, USER_STATUS.RESTRICTED] },
                _id: { $ne: this._id },
            });

            if (isExist) {
                return next(
                    new ApiError(
                        StatusCodes.BAD_REQUEST,
                        "An account with this email already exists"
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

export const User = mongoose.model<IUser, UserModel>("User", UserSchema);
