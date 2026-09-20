import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import QueryBuilder from "../../builder/QueryBuilder";
import { IServiceRequest, REQUEST_STATUS, SPECIALIZED_PAYMENT_TYPE } from "./serviceRequest.interface";
import { ServiceRequestModel } from "./serviceRequest.model";
import { PropertyModel } from "../property/property.model";
import { User } from "../user/user.model";
import { USER_ROLES } from "../../../enum/user";

// Create Service Request (Property Manager)
const createServiceRequest = async (userId: string, payload: IServiceRequest) => {
  // Verify property exists
  const property = await PropertyModel.findOne({ _id: payload.property, isDeleted: false });
  if (!property) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Property not found");
  }

  // Ensure property belongs to the property manager
  if (property.user.toString() !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "You can only create service requests for your own properties");
  }

  payload.user = userId as any;
  payload.status = REQUEST_STATUS.PENDING;

  const result = await ServiceRequestModel.create(payload);
  return result;
};

// Get all service requests (Role based access)
const getAllServiceRequests = async (query: Record<string, unknown>, userId: string, role: string) => {
  const searchFields = ["requestNo", "issueTitle", "description", "tenantName", "tenantPhone", "locationDetails"];
  let baseQuery: Record<string, unknown> = { isDeleted: false };

  if (role === USER_ROLES.PROPERTY_MANAGER) {
    baseQuery.user = userId;
  } else if (role === USER_ROLES.SERVICE_PROVIDER) {
    baseQuery.assignedProvider = userId;
  }

  const requestQueryBuilder = new QueryBuilder(
    ServiceRequestModel.find(baseQuery)
      .populate({
        path: "property",
        populate: [
          { path: "category", select: "name" },
          { path: "subCategory", select: "name" },
        ],
      })
      .populate("user", "firstName lastName email contact profileImage")
      .populate("assignedProvider", "firstName lastName email contact profileImage serviceProviderProfile"),
    query
  )
    .search(searchFields)
    .filter()
    .sort()
    .fields()
    .paginate();

  const requests = await requestQueryBuilder.modelQuery.lean();
  const paginationInfo = await requestQueryBuilder.getPaginationInfo();
  const totalRequests = await ServiceRequestModel.countDocuments(baseQuery);

  return {
    requests,
    meta: paginationInfo,
    totalRequests,
  };
};

// Get single service request details
const getSingleServiceRequest = async (id: string, userId: string, role: string) => {
  const request = await ServiceRequestModel.findOne({ _id: id, isDeleted: false })
    .populate({
      path: "property",
      populate: [
        { path: "category", select: "name" },
        { path: "subCategory", select: "name" },
      ],
    })
    .populate("user", "firstName lastName email contact profileImage")
    .populate("assignedProvider", "firstName lastName email contact profileImage serviceProviderProfile");

  if (!request) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Service request not found");
  }

  // Access control
  if (role === USER_ROLES.PROPERTY_MANAGER && request.user._id.toString() !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Access denied. You do not own this service request.");
  }
  if (role === USER_ROLES.SERVICE_PROVIDER && request.assignedProvider?._id.toString() !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Access denied. You are not assigned to this service request.");
  }

  return request;
};

// Assign contractor / service provider & set payout charge (Admin only)
const assignAndSetPayout = async (id: string, payload: Partial<IServiceRequest>) => {
  const existingRequest = await ServiceRequestModel.findOne({ _id: id, isDeleted: false });
  if (!existingRequest) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Service request not found");
  }

  // Validate provider if assigned
  if (payload.assignedProvider) {
    const provider = await User.findById(payload.assignedProvider);
    if (!provider || provider.role !== USER_ROLES.SERVICE_PROVIDER) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Assigned user is not a valid Service Provider");
    }
  }

  // Merge specializedRate if provided
  const specializedRate = {
    ...existingRequest.specializedRate,
    ...payload.specializedRate,
  };

  const basePayment = payload.basePayment !== undefined ? payload.basePayment : existingRequest.basePayment || 0;

  // Calculate final payout
  let finalPayout = basePayment;
  if (specializedRate && specializedRate.isActive) {
    const val = Number(specializedRate.value || 0);
    if (specializedRate.paymentType === SPECIALIZED_PAYMENT_TYPE.PERCENTAGE) {
      finalPayout = basePayment + (basePayment * val) / 100;
    } else if (specializedRate.paymentType === SPECIALIZED_PAYMENT_TYPE.FLAT_AMOUNT) {
      finalPayout = basePayment + val;
    }
  }

  const updateData: Partial<IServiceRequest> = {
    ...payload,
    specializedRate,
    basePayment,
    finalPayout,
  };

  // If assigning provider and status is still Pending, set status to Assigned
  if (payload.assignedProvider && (!payload.status || payload.status === REQUEST_STATUS.PENDING)) {
    updateData.status = REQUEST_STATUS.ASSIGNED;
  }

  const result = await ServiceRequestModel.findByIdAndUpdate(id, updateData, { new: true })
    .populate({
      path: "property",
      populate: [
        { path: "category", select: "name" },
        { path: "subCategory", select: "name" },
      ],
    })
    .populate("user", "firstName lastName email contact profileImage")
    .populate("assignedProvider", "firstName lastName email contact profileImage serviceProviderProfile");

  return result;
};

// Update request status
const updateStatus = async (id: string, userId: string, role: string, status: REQUEST_STATUS) => {
  const request = await ServiceRequestModel.findOne({ _id: id, isDeleted: false });
  if (!request) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Service request not found");
  }

  if (role === USER_ROLES.SERVICE_PROVIDER && request.assignedProvider?.toString() !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Access denied. You are not assigned to this job.");
  }
  if (role === USER_ROLES.PROPERTY_MANAGER && request.user.toString() !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Access denied. You do not own this request.");
  }

  const result = await ServiceRequestModel.findByIdAndUpdate(id, { status }, { new: true })
    .populate("property")
    .populate("user", "firstName lastName email contact")
    .populate("assignedProvider", "firstName lastName email contact");

  return result;
};

// Delete service request (Soft delete)
const deleteServiceRequest = async (id: string, userId: string, role: string) => {
  const request = await ServiceRequestModel.findOne({ _id: id, isDeleted: false });
  if (!request) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Service request not found");
  }

  if (role === USER_ROLES.PROPERTY_MANAGER && request.user.toString() !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Access denied.");
  }

  const result = await ServiceRequestModel.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
  return result;
};

export const ServiceRequestServices = {
  createServiceRequest,
  getAllServiceRequests,
  getSingleServiceRequest,
  assignAndSetPayout,
  updateStatus,
  deleteServiceRequest,
};
