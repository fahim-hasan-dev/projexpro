import { StatusCodes } from 'http-status-codes'
import ApiError from '../../../errors/ApiError'
import { IUser } from './user.interface'
import { User } from './user.model'
import { APPROVAL_STATUS, USER_ROLES, USER_STATUS } from '../../../enum/user'
import { JwtPayload } from 'jsonwebtoken'
import { logger } from '../../../shared/logger'
import QueryBuilder from '../../builder/QueryBuilder'
import config from '../../../config'


const getAllUser = async (query: Record<string, unknown>) => {
    const userQueryBuilder = new QueryBuilder(User.find().select('-password -authentication'), query)
        .filter()
        .sort()
        .fields()
        .paginate()


    const users = await userQueryBuilder.modelQuery.lean()
    const paginationInfo = await userQueryBuilder.getPaginationInfo()

    const totalUsers = await User.countDocuments()
    const staticData = { totalUsers }

    return {
        users,
        staticData,
        meta: paginationInfo,
    }
}

const getSingleUser = async (id: string) => {
    const result = await User.findById(id).select('-password -authentication')
    return result
}

// delete User
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
    payload: Partial<IUser>
) => {
    const isExistUser = await User.findById(user.authId)

    if (!isExistUser) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'User not found or deleted.')
    }

    const currentRole = payload.role || isExistUser.role

    const updateQuery: Record<string, any> = {}

    if (currentRole === USER_ROLES.SERVICE_PROVIDER) {
        delete payload.propertyManagerProfile
        updateQuery['$unset'] = { propertyManagerProfile: 1 }
    }

    if (payload.propertyManagerProfile && currentRole === USER_ROLES.PROPERTY_MANAGER) {
        const profileData = payload.propertyManagerProfile
        delete payload.propertyManagerProfile

        const flattenedProfile: Record<string, any> = {}
        Object.keys(profileData).forEach((key) => {
            flattenedProfile[`propertyManagerProfile.${key}`] = (profileData as any)[key]
        })

        // If previously rejected, set status to RESUBMITTED & clear rejectionReason
        if (isExistUser.propertyManagerProfile?.approvalStatus === APPROVAL_STATUS.REJECTED) {
            flattenedProfile['propertyManagerProfile.approvalStatus'] = APPROVAL_STATUS.RESUBMITTED
            flattenedProfile['propertyManagerProfile.rejectionReason'] = ''
        }

        updateQuery['$set'] = { ...payload, ...flattenedProfile }
    } else {
        updateQuery['$set'] = payload
    }

    const updatedUser = await User.findOneAndUpdate(
        { _id: user.authId, status: { $ne: USER_STATUS.DELETED } },
        updateQuery,
        { new: true },
    )

    if (!updatedUser) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update profile')
    }

    return updatedUser
}

const updatePropertyManagerProfile = async (
    user: JwtPayload,
    payload: Record<string, any>
) => {
    const isExistUser = await User.findById(user.authId)

    if (!isExistUser) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'User not found or deleted.')
    }

    if (isExistUser.role !== USER_ROLES.PROPERTY_MANAGER) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Property Manager profile is only available for Property Managers.')
    }

    const flattenedProfile: Record<string, any> = {}
    Object.keys(payload).forEach((key) => {
        flattenedProfile[`propertyManagerProfile.${key}`] = payload[key]
    })

    // On profile update/resubmission if rejected or pending, update approval status to RESUBMITTED and clear rejectionReason
    if (isExistUser.propertyManagerProfile?.approvalStatus === APPROVAL_STATUS.REJECTED) {
        flattenedProfile['propertyManagerProfile.approvalStatus'] = APPROVAL_STATUS.RESUBMITTED
        flattenedProfile['propertyManagerProfile.rejectionReason'] = ''
    }

    const updatedUser = await User.findOneAndUpdate(
        { _id: user.authId, status: { $ne: USER_STATUS.DELETED } },
        { $set: flattenedProfile },
        { new: true },
    )

    if (!updatedUser) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update Property Manager profile')
    }

    return updatedUser
}

const getProfile = async (user: JwtPayload) => {
    const isExistUser = await User.findById(user.authId).lean().select('-password -authentication')
    if (!isExistUser) {
        throw new ApiError(
            StatusCodes.NOT_FOUND,
            'The requested profile not found or deleted.',
        )
    }

    if (isExistUser.role === USER_ROLES.SERVICE_PROVIDER) {
        delete (isExistUser as any).propertyManagerProfile
    }

    return isExistUser
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
    updatePropertyManagerProfile,
    getAllUser,
    getSingleUser,
    deleteUser,
    getProfile,
    deleteMyAccount,
}
