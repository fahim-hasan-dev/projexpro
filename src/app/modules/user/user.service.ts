import { StatusCodes } from 'http-status-codes'
import ApiError from '../../../errors/ApiError'
import { IUser } from './user.interface'
import { User, calculateProfileCompletion } from './user.model'
import { APPROVAL_STATUS, USER_STATUS } from '../../../enum/user'
import { JwtPayload } from 'jsonwebtoken'
import QueryBuilder from '../../builder/QueryBuilder'

const getAllUser = async (query: Record<string, unknown>) => {
    const userQueryBuilder = new QueryBuilder(User.find().select('-password -authentication'), query)
        .filter()
        .sort()
        .fields()
        .paginate()

    const users = await userQueryBuilder.modelQuery.lean()
    const paginationInfo = await userQueryBuilder.getPaginationInfo()
    const totalUsers = await User.countDocuments()

    return {
        users,
        staticData: { totalUsers },
        meta: paginationInfo,
    }
}

const getSingleUser = async (id: string) => {
    const result = await User.findById(id).select('-password -authentication')
    return result
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

    const updateQuery: Record<string, any> = {}
    const isRejected = isExistUser.approvalStatus === APPROVAL_STATUS.REJECTED || isExistUser.profile?.approvalStatus === APPROVAL_STATUS.REJECTED;

    if (isRejected) {
        payload.approvalStatus = APPROVAL_STATUS.RESUBMITTED;
        payload.rejectionReason = '';
    }

    let setFields: Record<string, any> = {};

    // Extract root user fields vs profile fields
    const rootFields = ['firstName', 'lastName', 'username', 'email', 'contactNumber', 'phone', 'image', 'deviceToken', 'fcmToken', 'approvalStatus', 'rejectionReason'];
    
    Object.keys(payload).forEach((key) => {
        if (key === 'profile' && payload.profile && typeof payload.profile === 'object') {
            const profileObj = payload.profile as Record<string, any>;
            Object.keys(profileObj).forEach((pKey) => {
                setFields[`profile.${pKey}`] = profileObj[pKey];
            });
        } else if (rootFields.includes(key)) {
            setFields[key] = payload[key];
        } else {
            // Put role-specific profile fields directly inside profile
            setFields[`profile.${key}`] = payload[key];
        }
    });

    if (isRejected) {
        setFields['approvalStatus'] = APPROVAL_STATUS.RESUBMITTED;
        setFields['rejectionReason'] = '';
        setFields['profile.approvalStatus'] = APPROVAL_STATUS.RESUBMITTED;
        setFields['profile.rejectionReason'] = '';
    }

    updateQuery['$set'] = setFields;

    let updatedUser = await User.findOneAndUpdate(
        { _id: user.authId, status: { $ne: USER_STATUS.DELETED } },
        updateQuery,
        { new: true },
    )

    if (!updatedUser) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update profile')
    }

    // Recalculate profile completion percentage
    const completion = calculateProfileCompletion(updatedUser);
    updatedUser = await User.findByIdAndUpdate(
        user.authId,
        { profileCompletionPercentage: completion },
        { new: true }
    );

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
    getAllUser,
    getSingleUser,
    deleteUser,
    getProfile,
    deleteMyAccount,
}
