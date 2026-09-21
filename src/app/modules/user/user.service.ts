import { StatusCodes } from 'http-status-codes'
import ApiError from '../../../errors/ApiError'
import { IUser } from './user.interface'
import { User, calculateProfileCompletion } from './user.model'
import { APPROVAL_STATUS, USER_ROLES, USER_STATUS } from '../../../enum/user'
import { JwtPayload } from 'jsonwebtoken'
import QueryBuilder from '../../builder/QueryBuilder'

export const PROPERTY_MANAGER_PROFILE_FIELDS = [
    'contactFullName',
    'jobTitle',
    'businessEmail',
    'businessPhone',
    'companyName',
    'legalBusinessName',
    'dbaTradeName',
    'companyWebsiteUrl',
    'businessAddress',
    'city',
    'state',
    'taxId',
    'portfolioSize',
    'maintenanceInfrastructure',
    'propertyTypes',
    'approvalStatus',
    'rejectionReason',
]

export const SERVICE_PROVIDER_PROFILE_FIELDS = [
    'streetAddress',
    'city',
    'state',
    'zipCode',
    'bio',
    'skills',
    'companyName',
    'officeAddress',
    'officeCity',
    'officeState',
    'officeZipCode',
    'officePhone',
    'taxId',
    'yearsInBusiness',
    'licenses',
    'governmentId',
    'proofOfInsurance',
    'documents',
    'isAccountPaused',
    'approvalStatus',
    'rejectionReason',
]

export const ROOT_USER_FIELDS = [
    'firstName',
    'lastName',
    'username',
    'email',
    'contactNumber',
    'phone',
    'image',
    'deviceToken',
    'fcmToken',
    'approvalStatus',
    'rejectionReason',
    'status',
    'verified',
    'subscribe',
    'subscription',
    'totalUnitsUsed',
]

export const sanitizeUserProfile = (user: any) => {
    if (!user) return user;
    if (typeof user.toObject === 'function') {
        user = user.toObject();
    }

    delete user.authentication;
    delete user.password;

    if (!user.profile || typeof user.profile !== 'object') {
        return user;
    }

    const role = user.role;
    const cleanProfile: Record<string, any> = {};

    if (role === USER_ROLES.PROPERTY_MANAGER) {
        PROPERTY_MANAGER_PROFILE_FIELDS.forEach((field) => {
            if (user.profile[field] !== undefined) {
                cleanProfile[field] = user.profile[field];
            }
        });
        user.profile = cleanProfile;
    } else if (role === USER_ROLES.SERVICE_PROVIDER) {
        SERVICE_PROVIDER_PROFILE_FIELDS.forEach((field) => {
            if (user.profile[field] !== undefined) {
                cleanProfile[field] = user.profile[field];
            }
        });
        user.profile = cleanProfile;
    }

    return user;
}

const getAllUser = async (query: Record<string, unknown>) => {
    const userQueryBuilder = new QueryBuilder(User.find().select('-password -authentication'), query)
        .filter()
        .sort()
        .fields()
        .paginate()

    const users = await userQueryBuilder.modelQuery.lean()
    const paginationInfo = await userQueryBuilder.getPaginationInfo()
    const totalUsers = await User.countDocuments()

    const sanitizedUsers = users.map((u: any) => sanitizeUserProfile(u))

    return {
        users: sanitizedUsers,
        staticData: { totalUsers },
        meta: paginationInfo,
    }
}

const getSingleUser = async (id: string) => {
    const result = await User.findById(id).lean().select('-password -authentication')
    return result ? sanitizeUserProfile(result) : result
}

const deleteUser = async (id: string) => {
    const user = await User.findById(id)
    if (!user) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
    }

    const result = await User.findByIdAndDelete(id)
    return result
}

const updateProfile = async (
    user: JwtPayload,
    payload: Partial<IUser> & Record<string, any>
) => {
    const isExistUser = await User.findById(user.authId)

    if (!isExistUser) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'User not found or deleted.')
    }

    const userRole = isExistUser.role

    // Determine allowed and disallowed profile fields based on user role
    let allowedProfileFields: string[] = []
    let disallowedProfileFields: string[] = []

    if (userRole === USER_ROLES.PROPERTY_MANAGER) {
        allowedProfileFields = PROPERTY_MANAGER_PROFILE_FIELDS
        disallowedProfileFields = SERVICE_PROVIDER_PROFILE_FIELDS.filter(
            (f) => !PROPERTY_MANAGER_PROFILE_FIELDS.includes(f)
        )
    } else if (userRole === USER_ROLES.SERVICE_PROVIDER) {
        allowedProfileFields = SERVICE_PROVIDER_PROFILE_FIELDS
        disallowedProfileFields = PROPERTY_MANAGER_PROFILE_FIELDS.filter(
            (f) => !SERVICE_PROVIDER_PROFILE_FIELDS.includes(f)
        )
    } else {
        allowedProfileFields = [
            ...PROPERTY_MANAGER_PROFILE_FIELDS,
            ...SERVICE_PROVIDER_PROFILE_FIELDS,
        ]
    }

    const isRejected =
        isExistUser.approvalStatus === APPROVAL_STATUS.REJECTED ||
        isExistUser.profile?.approvalStatus === APPROVAL_STATUS.REJECTED

    if (isRejected) {
        payload.approvalStatus = APPROVAL_STATUS.RESUBMITTED
        payload.rejectionReason = ''
    }

    // Extract profile fields from payload sources
    let incomingProfileData: Record<string, any> = {}

    if (userRole === USER_ROLES.PROPERTY_MANAGER && payload.propertyManagerProfile && typeof payload.propertyManagerProfile === 'object') {
        Object.assign(incomingProfileData, payload.propertyManagerProfile)
    } else if (userRole === USER_ROLES.SERVICE_PROVIDER && payload.serviceProviderProfile && typeof payload.serviceProviderProfile === 'object') {
        Object.assign(incomingProfileData, payload.serviceProviderProfile)
    }

    if (payload.profile && typeof payload.profile === 'object') {
        Object.assign(incomingProfileData, payload.profile)
    }

    // Process flat payload keys as well
    Object.keys(payload).forEach((key) => {
        if (!['profile', 'propertyManagerProfile', 'serviceProviderProfile'].includes(key)) {
            if (allowedProfileFields.includes(key)) {
                incomingProfileData[key] = payload[key]
            }
        }
    })

    const setFields: Record<string, any> = {}
    const unsetFields: Record<string, any> = {}

    // Root user fields
    ROOT_USER_FIELDS.forEach((key) => {
        if (payload[key] !== undefined) {
            setFields[key] = payload[key]
        }
    })

    // Allowed profile fields ONLY
    allowedProfileFields.forEach((key) => {
        if (incomingProfileData[key] !== undefined) {
            setFields[`profile.${key}`] = incomingProfileData[key]
        }
    })

    // Purge any disallowed profile fields stored in DB for this role
    if (isExistUser.profile) {
        disallowedProfileFields.forEach((key) => {
            if ((isExistUser.profile as any)[key] !== undefined) {
                unsetFields[`profile.${key}`] = ''
            }
        })
    }

    if (isRejected) {
        setFields['approvalStatus'] = APPROVAL_STATUS.RESUBMITTED
        setFields['rejectionReason'] = ''
        setFields['profile.approvalStatus'] = APPROVAL_STATUS.RESUBMITTED
        setFields['profile.rejectionReason'] = ''
    }

    const updateQuery: Record<string, any> = {}
    if (Object.keys(setFields).length > 0) {
        updateQuery['$set'] = setFields
    }
    if (Object.keys(unsetFields).length > 0) {
        updateQuery['$unset'] = unsetFields
    }

    let updatedUser = await User.findOneAndUpdate(
        { _id: user.authId, status: { $ne: USER_STATUS.DELETED } },
        updateQuery,
        { new: true },
    )

    if (!updatedUser) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update profile')
    }

    // Recalculate profile completion percentage
    const completion = calculateProfileCompletion(updatedUser)
    updatedUser = await User.findByIdAndUpdate(
        user.authId,
        { profileCompletionPercentage: completion },
        { new: true }
    )

    return sanitizeUserProfile(updatedUser?.toObject())
}

const getProfile = async (user: JwtPayload) => {
    const isExistUser = await User.findById(user.authId).lean().select('-password -authentication')
    if (!isExistUser) {
        throw new ApiError(
            StatusCodes.NOT_FOUND,
            'The requested profile not found or deleted.',
        )
    }

    return sanitizeUserProfile(isExistUser)
}

const deleteMyAccount = async (user: JwtPayload) => {
    const isExistUser = await User.findById(user.authId)
    if (!isExistUser) {
        throw new ApiError(
            StatusCodes.NOT_FOUND,
            'The requested profile not found or deleted.',
        )
    }

    await User.findByIdAndDelete(isExistUser._id)

    return 'Account deleted successfully'
}

export const UserServices = {
    updateProfile,
    getAllUser,
    getSingleUser,
    deleteUser,
    getProfile,
    deleteMyAccount,
}

