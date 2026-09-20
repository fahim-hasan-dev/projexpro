import { Model, Types } from "mongoose";
import { APPROVAL_STATUS, USER_ROLES, USER_STATUS } from "../../../enum/user";
export { APPROVAL_STATUS, USER_ROLES, USER_STATUS };

export type ILicenseInformation = {
    licenseType?: string;
    licenseNumber?: string;
    dateIssued?: Date | string;
    stateIssued?: string;
    licenseDocument?: string;
};

export type IServiceProviderProfile = {
    streetAddress?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    bio?: string;
    skills?: string[];
    companyName?: string;
    officeAddress?: string;
    officeCity?: string;
    officeState?: string;
    officeZipCode?: string;
    officePhone?: string;
    taxId?: string;
    yearsInBusiness?: number;
    licenses?: ILicenseInformation[];
    governmentId?: string;
    proofOfInsurance?: string;
    documents?: { title: string; fileUrl: string; type?: string }[];
    isAccountPaused?: boolean;
    approvalStatus?: APPROVAL_STATUS;
    rejectionReason?: string;
};

export type IPropertyManagerProfile = {
    contactFullName?: string;
    jobTitle?: string;
    businessEmail?: string;
    businessPhone?: string;
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
    approvalStatus?: APPROVAL_STATUS;
    rejectionReason?: string;
};

export type IUserProfile = IPropertyManagerProfile & IServiceProviderProfile;

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

export type IUserSubscriptionInfo = {
    plan?: Types.ObjectId;
    subscriptionId?: string;
    status?: 'active' | 'expired' | 'cancel' | string;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
};

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
    approvalStatus?: APPROVAL_STATUS;
    rejectionReason?: string;
    profileCompletionPercentage?: number;
    totalUnitsUsed?: number;
    subscribe?: boolean;
    subscription?: IUserSubscriptionInfo;
    profile?: IUserProfile;
    authentication: IAuthentication;
    deviceToken?: string;
    fcmToken?: string;
    fullName?: string;
};

export type UserModel = {
    isPasswordMatched: (givenPassword: string, savedPassword: string) => Promise<boolean>;
} & Model<IUser>;
