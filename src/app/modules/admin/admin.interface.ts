import { Model, Types } from "mongoose";
import { ADMIN_ROLES, USER_STATUS } from "../../../enum/user";

export type IAdminAuthentication = {
    restrictionLeftAt?: Date | null;
    resetPassword?: boolean;
    wrongLoginAttempts?: number;
    passwordChangedAt?: Date;
    oneTimeCode?: string;
    latestRequestAt?: Date;
    expiresAt?: Date;
    requestCount?: number;
    authType?: 'createAccount' | 'resetPassword';
};

export type IAdmin = {
    _id: Types.ObjectId;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: ADMIN_ROLES;
    contactNumber?: string;
    phone?: string;
    image?: string;
    status: USER_STATUS;
    verified: boolean;
    authentication?: IAdminAuthentication;
    deviceToken?: string;
    fcmToken?: string;
    fullName?: string;
};

export type AdminModel = {
    isPasswordMatched: (givenPassword: string, savedPassword: string) => Promise<boolean>;
} & Model<IAdmin>;
