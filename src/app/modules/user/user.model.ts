import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import { IUser, USER_ROLES, USER_STATUS, APPROVAL_STATUS, UserModel } from "./user.interface";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import config from "../../../config";

export const calculateProfileCompletion = (user: any): number => {
    let completedPoints = 0;
    let totalPoints = 0;

    const checkField = (val: any) => {
        totalPoints += 1;
        if (val !== undefined && val !== null && val !== "" && (Array.isArray(val) ? val.length > 0 : true)) {
            completedPoints += 1;
        }
    };

    // Basic user info
    checkField(user.firstName);
    checkField(user.lastName);
    checkField(user.email);
    checkField(user.phone || user.contactNumber);
    checkField(user.image);

    const prof = user.profile || {};

    if (user.role === USER_ROLES.PROPERTY_MANAGER) {
        checkField(prof.contactFullName);
        checkField(prof.jobTitle);
        checkField(prof.businessEmail);
        checkField(prof.businessPhone);
        checkField(prof.companyName);
        checkField(prof.businessAddress);
        checkField(prof.city);
        checkField(prof.state);
        checkField(prof.taxId);
        checkField(prof.portfolioSize);
        checkField(prof.maintenanceInfrastructure);
        checkField(prof.propertyTypes);
    } else if (user.role === USER_ROLES.SERVICE_PROVIDER) {
        checkField(prof.streetAddress);
        checkField(prof.city);
        checkField(prof.state);
        checkField(prof.zipCode);
        checkField(prof.bio);
        checkField(prof.skills);
        checkField(prof.companyName);
        checkField(prof.officeAddress);
        checkField(prof.officeCity);
        checkField(prof.officeState);
        checkField(prof.officeZipCode);
        checkField(prof.officePhone);
        checkField(prof.taxId);
        checkField(prof.yearsInBusiness);
        checkField(prof.licenses);
        checkField(prof.governmentId || prof.proofOfInsurance || prof.documents);
    }

    if (totalPoints === 0) return 0;
    return Math.min(100, Math.round((completedPoints / totalPoints) * 100));
};

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
            select: false,
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
            required: [true, 'Username is required'],
            unique: true,
            trim: true,
            lowercase: true,
            sparse: true,
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
        approvalStatus: {
            type: String,
            enum: Object.values(APPROVAL_STATUS),
            default: APPROVAL_STATUS.PENDING,
        },
        rejectionReason: {
            type: String,
            default: "",
        },
        profileCompletionPercentage: {
            type: Number,
            default: 0,
        },
        totalUnitsUsed: {
            type: Number,
            default: 0,
        },
        subscribe: {
            type: Boolean,
            default: false,
        },
        subscription: {
            type: {
                plan: { type: Schema.Types.ObjectId, ref: 'Plan' },
                subscriptionId: { type: String, default: "" },
                status: { type: String, default: "" },
                currentPeriodStart: { type: Date, default: null },
                currentPeriodEnd: { type: Date, default: null },
            },
            default: undefined,
            _id: false,
        },
        profile: {
            type: {
                // Property Manager Profile Fields
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

                // Service Provider Profile Fields
                streetAddress: { type: String, trim: true },
                zipCode: { type: String, trim: true },
                bio: { type: String, trim: true },
                skills: [{ type: String, trim: true }],
                officeAddress: { type: String, trim: true },
                officeCity: { type: String, trim: true },
                officeState: { type: String, trim: true },
                officeZipCode: { type: String, trim: true },
                officePhone: { type: String, trim: true },
                yearsInBusiness: { type: Number, default: 0 },
                licenses: [
                    {
                        licenseType: { type: String, trim: true },
                        licenseNumber: { type: String, trim: true },
                        dateIssued: { type: Date, default: null },
                        stateIssued: { type: String, trim: true },
                        licenseDocument: { type: String, default: "" },
                        _id: false,
                    },
                ],
                governmentId: { type: String, default: "" },
                proofOfInsurance: { type: String, default: "" },
                documents: [
                    {
                        title: { type: String, trim: true },
                        fileUrl: { type: String, trim: true },
                        type: { type: String, trim: true },
                        _id: false,
                    },
                ],
                isAccountPaused: { type: Boolean, default: false },
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
            type: {
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
            select: false,
            _id: false,
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
            transform: function (doc, ret) {
                delete ret.password;
                delete ret.authentication;
                return ret;
            },
        },
        toObject: {
            transform: function (doc, ret) {
                delete ret.password;
                delete ret.authentication;
                return ret;
            },
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
        if (!this.approvalStatus) {
            this.approvalStatus = APPROVAL_STATUS.PENDING;
        }

        if (this.profile) {
            this.profile.approvalStatus = this.approvalStatus;
            this.profile.rejectionReason = this.rejectionReason || "";
        }

        this.profileCompletionPercentage = calculateProfileCompletion(this);

        if (this.isModified("username") && this.username) {
            const isExistUsername = await User.findOne({
                username: this.username.toLowerCase().trim(),
                status: { $in: [USER_STATUS.ACTIVE, USER_STATUS.RESTRICTED] },
                _id: { $ne: this._id },
            });

            if (isExistUsername) {
                return next(
                    new ApiError(
                        StatusCodes.BAD_REQUEST,
                        "An account with this username already exists"
                    )
                );
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
