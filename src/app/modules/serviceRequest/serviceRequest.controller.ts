import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { ServiceRequestServices } from "./serviceRequest.service";
import { StatusCodes } from "http-status-codes";

// Create Service Request (Property Manager)
const createServiceRequest = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.authId || req.user.id;
  const payload = req.body;

  // Normalize uploaded images from middleware if present
  if (req.body.images && Array.isArray(req.body.images)) {
    payload.images = req.body.images;
  } else if (req.body.image) {
    payload.images = [req.body.image];
  } else if (req.body.media) {
    payload.images = Array.isArray(req.body.media) ? req.body.media : [req.body.media];
  }

  const result = await ServiceRequestServices.createServiceRequest(userId, payload);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Service request created successfully",
    data: result,
  });
});

// Get All Service Requests (Filterable by role & query)
const getAllServiceRequests = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.authId || req.user.id;
  const role = req.user.role;

  const result = await ServiceRequestServices.getAllServiceRequests(req.query, userId, role);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Service requests retrieved successfully",
    data: result,
  });
});

// Get Single Service Request
const getSingleServiceRequest = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user.authId || req.user.id;
  const role = req.user.role;

  const result = await ServiceRequestServices.getSingleServiceRequest(id, userId, role);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Service request retrieved successfully",
    data: result,
  });
});

// Assign Contractor & Set Payout (Admin only)
const assignAndSetPayout = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const payload = req.body;

  const result = await ServiceRequestServices.assignAndSetPayout(id, payload);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Service request assigned and payout updated successfully",
    data: result,
  });
});

// Update Request Status
const updateStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.authId || req.user.id;
  const role = req.user.role;

  const result = await ServiceRequestServices.updateStatus(id, userId, role, status);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Service request status updated successfully",
    data: result,
  });
});

// Delete Service Request
const deleteServiceRequest = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user.authId || req.user.id;
  const role = req.user.role;

  const result = await ServiceRequestServices.deleteServiceRequest(id, userId, role);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Service request deleted successfully",
    data: result,
  });
});

export const ServiceRequestControllers = {
  createServiceRequest,
  getAllServiceRequests,
  getSingleServiceRequest,
  assignAndSetPayout,
  updateStatus,
  deleteServiceRequest,
};
