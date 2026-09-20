import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../errors/ApiError';
import { APPROVAL_STATUS, USER_ROLES } from '../../enum/user';
import { User } from '../modules/user/user.model';

export const requireApproval = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            throw new ApiError(StatusCodes.UNAUTHORIZED, 'Authentication required');
        }

        // Admins and Super Admins don't need approval
        if (req.user.role === 'admin' || req.user.role === 'super_admin') {
            return next();
        }

        const user = await User.findById(req.user.authId || req.user.id).select('role propertyManagerProfile');

        if (!user) {
            // Check if admin
            return next();
        }

        // Service Provider is always auto-approved
        if (user.role === USER_ROLES.SERVICE_PROVIDER) {
            return next();
        }

        if (user.role === USER_ROLES.PROPERTY_MANAGER) {
            const approvalStatus = user.propertyManagerProfile?.approvalStatus || APPROVAL_STATUS.PENDING;
            const rejectionReason = user.propertyManagerProfile?.rejectionReason;

            if (approvalStatus === APPROVAL_STATUS.PENDING || approvalStatus === APPROVAL_STATUS.RESUBMITTED) {
                throw new ApiError(
                    StatusCodes.FORBIDDEN,
                    'Your Property Manager account is currently pending admin approval. Please wait for an administrator to review and approve your account.'
                );
            }

            if (approvalStatus === APPROVAL_STATUS.REJECTED) {
                const reasonText = rejectionReason ? `: ${rejectionReason}` : '.';
                throw new ApiError(
                    StatusCodes.FORBIDDEN,
                    `Your Property Manager account application was rejected${reasonText} Please update and resubmit your profile details for re-evaluation.`
                );
            }
        }

        next();
    } catch (error) {
        next(error);
    }
};

export default requireApproval;
