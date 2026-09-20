import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import { AdminServices } from './admin.service';

const createAdmin = catchAsync(async (req: Request, res: Response) => {
    const result = await AdminServices.createAdmin(req.body);
    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: 'Admin account created successfully',
        data: result,
    });
});

const getAllAdmins = catchAsync(async (req: Request, res: Response) => {
    const result = await AdminServices.getAllAdmins(req.query);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Admins retrieved successfully',
        data: result,
    });
});

const getSingleAdmin = catchAsync(async (req: Request, res: Response) => {
    const result = await AdminServices.getSingleAdmin(req.params.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Admin retrieved successfully',
        data: result,
    });
});

const updateAdmin = catchAsync(async (req: Request, res: Response) => {
    const result = await AdminServices.updateAdmin(req.params.id, req.body);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Admin updated successfully',
        data: result,
    });
});

const deleteAdmin = catchAsync(async (req: Request, res: Response) => {
    const result = await AdminServices.deleteAdmin(req.params.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Admin deleted successfully',
        data: result,
    });
});

const getAdminProfile = catchAsync(async (req: Request, res: Response) => {
    const result = await AdminServices.getAdminProfile(req.user);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Admin profile retrieved successfully',
        data: result,
    });
});

const updateAdminProfile = catchAsync(async (req: Request, res: Response) => {
    const result = await AdminServices.updateAdminProfile(req.user, req.body);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Admin profile updated successfully',
        data: result,
    });
});

export const AdminController = {
    createAdmin,
    getAllAdmins,
    getSingleAdmin,
    updateAdmin,
    deleteAdmin,
    getAdminProfile,
    updateAdminProfile,
};
