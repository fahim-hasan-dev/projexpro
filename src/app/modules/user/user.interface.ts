import { Model, Types } from "mongoose";
import { APPROVAL_STATUS, USER_ROLES, USER_STATUS } from "../../../enum/user";
export { APPROVAL_STATUS, USER_ROLES, USER_STATUS };

export type IPropertyManagerProfile = {
    // Contact Details (Step 2)
    contactFullName?: string;
    jobTitle?: string;
    businessEmail?: string;
    businessPhone?: string;

    // Business Details (Step 3 & 4)
    companyName?: string;
    legalBusinessName?: string;
    dbaTradeName?: string;
    companyWebsiteUrl?: string;
    businessAddress?: string;
    city?: string;
    state?: string;
    taxId?: string;
    portfolioSize?: '1-10 Units' | '11-50 Units' | '51-200 Units' | '201-500 Units' | '501+ Units' | string;
    maintenanceInfrastructure?: string;
    propertyTypes?: string[];

    // Approval Information
    approvalStatus?: APPROVAL_STATUS;
    rejectionReason?: string;
};

type IAuthentication = {
    restrictionLeftAt: Date | null
    resetPassword: boolean
    wrongLoginAttempts: number
    passwordChangedAt?: Date
    oneTimeCode: string
    latestRequestAt: Date
    expiresAt?: Date
    requestCount?: number
    authType?: 'createAccount' | 'resetPassword'
}

export type IUser = {
    _id: Types.ObjectId;
    firstName: string;
    lastName: string;
    username?: string;
    email: string;
    contactNumber?: string;
    phone?: string;
    image?: string;
    password: string;
    status: USER_STATUS;
    verified: boolean;
    role: USER_ROLES;
    propertyManagerProfile?: IPropertyManagerProfile;
    authentication: IAuthentication;
    deviceToken?: string;
    fcmToken?: string;
    fullName?: string;
};

export type UserModel = {
    isPasswordMatched: (givenPassword: string, savedPassword: string) => Promise<boolean>;
} & Model<IUser>;
