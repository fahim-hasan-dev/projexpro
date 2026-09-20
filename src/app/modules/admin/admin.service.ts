import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { IAdmin } from './admin.interface';
import { Admin } from './admin.model';
import { User } from '../user/user.model';
import { ADMIN_ROLES, APPROVAL_STATUS, USER_ROLES, USER_STATUS } from '../../../enum/user';
import { JwtPayload } from 'jsonwebtoken';
import QueryBuilder from '../../builder/QueryBuilder';

const createAdmin = async (payload: IAdmin): Promise<IAdmin> => {
    payload.email = payload.email?.toLowerCase().trim();
    if (payload.contactNumber && !payload.phone) {
        payload.phone = payload.contactNumber;
    }

    const isExist = await Admin.findOne({
        email: payload.email,
        status: { $ne: USER_STATUS.DELETED },
    });

    if (isExist) {
        throw new ApiError(
            StatusCodes.BAD_REQUEST,
            'An admin account with this email already exists.'
        );
    }

    payload.role = payload.role || ADMIN_ROLES.ADMIN;
    payload.verified = true;

    const result = await Admin.create(payload);
    return result;
};

const getAllAdmins = async (query: Record<string, unknown>) => {
    const adminQueryBuilder = new QueryBuilder(
        Admin.find({ status: { $ne: USER_STATUS.DELETED } }).select('-password -authentication'),
        query
    )
        .filter()
        .sort()
        .fields()
        .paginate();

    const admins = await adminQueryBuilder.modelQuery.lean();
    const paginationInfo = await adminQueryBuilder.getPaginationInfo();
    const totalAdmins = await Admin.countDocuments({ status: { $ne: USER_STATUS.DELETED } });

    return {
        admins,
        meta: paginationInfo,
        totalAdmins,
    };
};

const getSingleAdmin = async (id: string) => {
    const result = await Admin.findById(id).select('-password -authentication');
    if (!result) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Admin not found');
    }
    return result;
};

const updateAdmin = async (id: string, payload: Partial<IAdmin>) => {
    const isExist = await Admin.findById(id);
    if (!isExist) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Admin not found');
    }

    const result = await Admin.findByIdAndUpdate(id, payload, { new: true }).select('-password -authentication');
    return result;
};

const deleteAdmin = async (id: string) => {
    const isExist = await Admin.findById(id);
    if (!isExist) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Admin not found');
    }

    if (isExist.role === ADMIN_ROLES.SUPER_ADMIN) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Super Admin account cannot be deleted.');
    }

    const result = await Admin.findByIdAndUpdate(id, { status: USER_STATUS.DELETED }, { new: true });
    return result;
};

const getAdminProfile = async (user: JwtPayload) => {
    const profile = await Admin.findById(user.authId).lean().select('-password -authentication');
    if (!profile) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Admin profile not found');
    }
    return profile;
};

const updateAdminProfile = async (user: JwtPayload, payload: Partial<IAdmin>) => {
    const isExist = await Admin.findById(user.authId);
    if (!isExist) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Admin profile not found');
    }

    const result = await Admin.findByIdAndUpdate(user.authId, payload, { new: true }).select('-password -authentication');
    return result;
};

const manageUserApproval = async (
    id: string,
    payload: { approvalStatus: APPROVAL_STATUS; rejectionReason?: string }
) => {
    const user = await User.findById(id);
    if (!user) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'User account not found');
    }

    if (user.role !== USER_ROLES.PROPERTY_MANAGER && user.role !== USER_ROLES.SERVICE_PROVIDER) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Only Property Managers and Service Providers require approval management');
    }

    const rejectionReason = payload.approvalStatus === APPROVAL_STATUS.REJECTED 
        ? (payload.rejectionReason || 'Application rejected by administrator')
        : '';

    const updateData: Record<string, any> = {
        approvalStatus: payload.approvalStatus,
        rejectionReason,
    };

    updateData['profile.approvalStatus'] = payload.approvalStatus;
    updateData['profile.rejectionReason'] = rejectionReason;

    const result = await User.findByIdAndUpdate(id, updateData, { new: true }).select('-password -authentication');
    return result;
};

const managePropertyManagerApproval = manageUserApproval;

const getAllPropertyManagers = async (query: Record<string, unknown>) => {
    const userQueryBuilder = new QueryBuilder(
        User.find({ role: USER_ROLES.PROPERTY_MANAGER, status: { $ne: USER_STATUS.DELETED } }).select('-password -authentication'),
        query
    )
        .filter()
        .sort()
        .fields()
        .paginate();

    const propertyManagers = await userQueryBuilder.modelQuery.lean();
    const paginationInfo = await userQueryBuilder.getPaginationInfo();
    const totalPropertyManagers = await User.countDocuments({
        role: USER_ROLES.PROPERTY_MANAGER,
        status: { $ne: USER_STATUS.DELETED },
    });

    return {
        propertyManagers,
        meta: paginationInfo,
        totalPropertyManagers,
    };
};

const getAllServiceProviders = async (query: Record<string, unknown>) => {
    const userQueryBuilder = new QueryBuilder(
        User.find({ role: USER_ROLES.SERVICE_PROVIDER, status: { $ne: USER_STATUS.DELETED } }).select('-password -authentication'),
        query
    )
        .filter()
        .sort()
        .fields()
        .paginate();

    const serviceProviders = await userQueryBuilder.modelQuery.lean();
    const paginationInfo = await userQueryBuilder.getPaginationInfo();
    const totalServiceProviders = await User.countDocuments({
        role: USER_ROLES.SERVICE_PROVIDER,
        status: { $ne: USER_STATUS.DELETED },
    });

    return {
        serviceProviders,
        meta: paginationInfo,
        totalServiceProviders,
    };
};

export const AdminServices = {
    createAdmin,
    getAllAdmins,
    getSingleAdmin,
    updateAdmin,
    deleteAdmin,
    getAdminProfile,
    updateAdminProfile,
    manageUserApproval,
    managePropertyManagerApproval,
    getAllPropertyManagers,
    getAllServiceProviders,
};
