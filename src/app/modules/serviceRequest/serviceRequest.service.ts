import { StatusCodes } from "http-status-codes";
import { Types } from "mongoose";
import ApiError from "../../../errors/ApiError";
import QueryBuilder from "../../builder/QueryBuilder";
import { IServiceRequest, REQUEST_STATUS, SPECIALIZED_PAYMENT_TYPE } from "./serviceRequest.interface";
import { ServiceRequestModel } from "./serviceRequest.model";
import { PropertyModel } from "../property/property.model";
import { User } from "../user/user.model";
import { USER_ROLES, ADMIN_ROLES } from "../../../enum/user";
import { NotificationService } from "../notification/notification.service";
import { InvoiceServices } from "../invoice/invoice.service";

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

  // Notify all admins about the new service request
  try {
    const admins = await User.find({ role: { $in: [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN] } });
    for (const admin of admins) {
      await NotificationService.insertNotification({
        receiver: admin._id,
        title: "New Service Request",
        message: `New service request ${result.requestNo} ("${result.issueTitle}") has been created.`,
        referenceId: result._id,
        screen: "SERVICE_REQUEST",
        type: "ADMIN",
      });
    }
  } catch (error) {
    console.error("Failed to send notification on service request creation:", error);
  }

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
        select: "name title propertyType address totalUnits image category subCategory",
        populate: [
          { path: "category", select: "name image" },
          { path: "subCategory", select: "name image" },
        ],
      })
      .populate("user", "firstName lastName userName email phone contactNumber image role")
      .populate("assignedProvider", "firstName lastName userName email phone contactNumber image role profile"),
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
      select: "name title propertyType address totalUnits image category subCategory",
      populate: [
        { path: "category", select: "name image" },
        { path: "subCategory", select: "name image" },
      ],
    })
    .populate("user", "firstName lastName userName email phone contactNumber image role")
    .populate("assignedProvider", "firstName lastName userName email phone contactNumber image role profile");

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

  const previousProviderId = existingRequest.assignedProvider ? existingRequest.assignedProvider.toString() : null;

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
      select: "name title propertyType address totalUnits image category subCategory",
      populate: [
        { path: "category", select: "name image" },
        { path: "subCategory", select: "name image" },
      ],
    })
    .populate("user", "firstName lastName userName email phone contactNumber image role")
    .populate("assignedProvider", "firstName lastName userName email phone contactNumber image role profile");

  if (!result) return result;

  try {
    // Send notification to newly assigned Service Provider
    if (payload.assignedProvider) {
      const newProviderId = payload.assignedProvider.toString();
      await NotificationService.insertNotification({
        receiver: new Types.ObjectId(newProviderId),
        title: "Service Request Assigned",
        message: `You have been assigned to service request ${result.requestNo} ("${result.issueTitle}"). Total Payout: £${result.finalPayout || result.basePayment || 0}.`,
        referenceId: result._id,
        screen: "SERVICE_REQUEST",
        type: "USER",
      });

      // If reassigned from an old provider to a new provider, notify old provider
      if (previousProviderId && previousProviderId !== newProviderId) {
        await NotificationService.insertNotification({
          receiver: new Types.ObjectId(previousProviderId),
          title: "Service Request Reassigned",
          message: `Service request ${result.requestNo} has been reassigned to another service provider.`,
          referenceId: result._id,
          screen: "SERVICE_REQUEST",
          type: "USER",
        });
      }
    }

    // Send notification to Property Manager (Request Owner)
    if (result.user) {
      const managerId = (result.user as any)._id ? (result.user as any)._id.toString() : result.user.toString();
      await NotificationService.insertNotification({
        receiver: new Types.ObjectId(managerId),
        title: "Service Request Assigned & Price Set",
        message: `Your service request ${result.requestNo} has been assigned to a service provider. Total charge: £${result.finalPayout || result.basePayment || 0}.`,
        referenceId: result._id,
        screen: "SERVICE_REQUEST",
        type: "USER",
      });
    }
  } catch (error) {
    console.error("Failed to send notification on assignment:", error);
  }

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
    .populate("property", "name title propertyType address totalUnits image")
    .populate("user", "firstName lastName userName email phone contactNumber image role")
    .populate("assignedProvider", "firstName lastName userName email phone contactNumber image role profile");

  if (!result) return result;

  try {
    const managerId = (result.user as any)._id ? (result.user as any)._id.toString() : result.user.toString();

    if (status === REQUEST_STATUS.IN_PROGRESS) {
      // Notify Property Manager
      await NotificationService.insertNotification({
        receiver: new Types.ObjectId(managerId),
        title: "Service Request In Progress",
        message: `Work has started on service request ${result.requestNo} ("${result.issueTitle}").`,
        referenceId: result._id,
        screen: "SERVICE_REQUEST",
        type: "USER",
      });

      // Notify Admins
      const admins = await User.find({ role: { $in: [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN] } });
      for (const admin of admins) {
        await NotificationService.insertNotification({
          receiver: admin._id,
          title: "Service Request In Progress",
          message: `Service request ${result.requestNo} is now in progress.`,
          referenceId: result._id,
          screen: "SERVICE_REQUEST",
          type: "ADMIN",
        });
      }
    } else if (status === REQUEST_STATUS.COMPLETED) {
      // Auto-generate Invoice for completed Service Request
      try {
        await InvoiceServices.createInvoiceFromServiceRequest(result._id);
      } catch (err) {
        console.error("Failed to auto-generate invoice on completion:", err);
      }

      // Notify Property Manager
      await NotificationService.insertNotification({
        receiver: new Types.ObjectId(managerId),
        title: "Service Request Completed",
        message: `Service request ${result.requestNo} ("${result.issueTitle}") has been completed by the service provider. An invoice has been generated.`,
        referenceId: result._id,
        screen: "SERVICE_REQUEST",
        type: "USER",
      });

      // Notify Admins
      const admins = await User.find({ role: { $in: [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN] } });
      for (const admin of admins) {
        await NotificationService.insertNotification({
          receiver: admin._id,
          title: "Service Request Completed",
          message: `Service request ${result.requestNo} has been marked as completed and invoice generated.`,
          referenceId: result._id,
          screen: "SERVICE_REQUEST",
          type: "ADMIN",
        });
      }
    }
  } catch (error) {
    console.error("Failed to send notification on status update:", error);
  }

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
