import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { PropertyServices } from "./property.service";
import { StatusCodes } from "http-status-codes";
import { USER_ROLES } from "../../../enum/user";

// Create Property (Property Manager)
const createProperty = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.authId || req.user.id;
  const payload = req.body;

  // Handle uploaded cover photo from req.body.image if present
  if (req.body.image && !payload.coverPhoto) {
    payload.coverPhoto = req.body.image;
  }

  const result = await PropertyServices.createProperty(userId, payload);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Property created successfully",
    data: result,
  });
});

// Get My Properties (Property Manager's list)
const getMyProperties = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.authId || req.user.id;
  const result = await PropertyServices.getAllProperties(req.query, userId, true);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Properties retrieved successfully",
    data: result,
  });
});

// Get All Properties (For Admins or general listing)
const getAllProperties = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.authId || req.user?.id;
  const isPropertyManager = req.user?.role === USER_ROLES.PROPERTY_MANAGER;

  const result = await PropertyServices.getAllProperties(req.query, userId, isPropertyManager);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Properties retrieved successfully",
    data: result,
  });
});

// Get Single Property
const getSingleProperty = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.authId || req.user?.id;
  const isPropertyManager = req.user?.role === USER_ROLES.PROPERTY_MANAGER;

  const result = await PropertyServices.getSingleProperty(id, userId, isPropertyManager);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Property retrieved successfully",
    data: result,
  });
});

// Update Property
const updateProperty = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user.authId || req.user.id;
  const isAdmin = req.user.role === "admin" || req.user.role === "super_admin";
  const payload = req.body;

  if (req.body.image && !payload.coverPhoto) {
    payload.coverPhoto = req.body.image;
  }

  const result = await PropertyServices.updateProperty(id, userId, payload, isAdmin);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Property updated successfully",
    data: result,
  });
});

// Delete Property
const deleteProperty = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user.authId || req.user.id;
  const isAdmin = req.user.role === "admin" || req.user.role === "super_admin";

  const result = await PropertyServices.deleteProperty(id, userId, isAdmin);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Property deleted successfully",
    data: result,
  });
});

export const PropertyControllers = {
  createProperty,
  getMyProperties,
  getAllProperties,
  getSingleProperty,
  updateProperty,
  deleteProperty,
};
