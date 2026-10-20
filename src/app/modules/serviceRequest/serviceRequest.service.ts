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

// Helper to populate service request
const populateServiceRequestQuery = (query: any) => {
  return query
    .populate({
      path: "property",
      select: "name title propertyType address totalUnits image category subCategory",
      populate: [
        { path: "category", select: "name image" },
        { path: "subCategory", select: "name image" },
      ],
    })
    .populate("user", "firstName lastName userName email phone contactNumber image role")
    .populate("assignedProvider", "firstName lastName userName email phone contactNumber image role profile")
    .populate("invoice", "invoiceNo status totalAmount paidAmount balanceDue stripeCheckoutSessionId dueDate");
};

// 1. Create Service Request (Property Manager)
const createServiceRequest = async (userId: string, payload: IServiceRequest) => {
  const property = await PropertyModel.findOne({ _id: payload.property, isDeleted: false });
  if (!property) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Property not found");
  }

  if (property.user.toString() !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "You can only create service requests for your own properties");
  }

  payload.user = userId as any;
  payload.status = REQUEST_STATUS.PENDING;

  const result = await ServiceRequestModel.create(payload);

  // Notify Admins
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

// 2. Get all service requests (Role based access)
const getAllServiceRequests = async (query: Record<string, unknown>, userId: string, role: string) => {
  const searchFields = ["requestNo", "issueTitle", "description", "tenantName", "tenantPhone", "locationDetails"];
  let baseQuery: Record<string, unknown> = { isDeleted: false };
  const safeQuery = { ...query };

  if (role === USER_ROLES.PROPERTY_MANAGER) {
    baseQuery.user = userId;
    delete safeQuery.user;
  } else if (role === USER_ROLES.SERVICE_PROVIDER) {
    baseQuery.assignedProvider = userId;
    delete safeQuery.assignedProvider;
  }

  const requestQueryBuilder = new QueryBuilder(
    populateServiceRequestQuery(ServiceRequestModel.find(baseQuery)),
    safeQuery
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

// 3. Get single service request details
const getSingleServiceRequest = async (id: string, userId: string, role: string) => {
  const request = await populateServiceRequestQuery(
    ServiceRequestModel.findOne({ _id: id, isDeleted: false })
  );

  if (!request) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Service request not found");
  }

  const requestOwnerId = request.user && (request.user as any)._id ? (request.user as any)._id.toString() : request.user?.toString();
  if (role === USER_ROLES.PROPERTY_MANAGER && requestOwnerId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Access denied. You do not own this service request.");
  }

  const providerId = request.assignedProvider && (request.assignedProvider as any)._id ? (request.assignedProvider as any)._id.toString() : request.assignedProvider?.toString();
  if (role === USER_ROLES.SERVICE_PROVIDER && providerId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Access denied. You are not assigned to this service request.");
  }

  return request;
};

// 4. Assign contractor & set payout (Admin only, handles initial assign and reassigning)
const assignAndSetPayout = async (id: string, payload: Partial<IServiceRequest>) => {
  const existingRequest = await ServiceRequestModel.findOne({ _id: id, isDeleted: false }).lean();
  if (!existingRequest) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Service request not found");
  }

  if (payload.assignedProvider) {
    const providerUser = await User.findById(payload.assignedProvider).lean();
    if (!providerUser || providerUser.role !== USER_ROLES.SERVICE_PROVIDER) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Assigned user is not a valid Service Provider");
    }
  }

  const specializedRate = {
    ...(existingRequest.specializedRate || {}),
    ...(payload.specializedRate || {}),
  };

  const basePayment = payload.basePayment !== undefined ? payload.basePayment : existingRequest.basePayment || 0;

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
    rejectionReason: "", // Clear previous rejection reason upon new assignment
  };

  // If assigning provider, set status to Assigned
  if (payload.assignedProvider) {
    updateData.status = REQUEST_STATUS.ASSIGNED;
  }

  const result = await populateServiceRequestQuery(
    ServiceRequestModel.findByIdAndUpdate(id, updateData, { new: true })
  );

  if (!result) return result;

  try {
    // Notify newly assigned Service Provider
    if (payload.assignedProvider) {
      await NotificationService.insertNotification({
        receiver: new Types.ObjectId(payload.assignedProvider.toString()),
        title: "Service Request Assigned",
        message: `You have been assigned to service request ${result.requestNo} ("${result.issueTitle}"). Total Payout: $${result.finalPayout || result.basePayment || 0}. Please accept or reject.`,
        referenceId: result._id,
        screen: "SERVICE_REQUEST",
        type: "USER",
      });
    }

    // Notify Property Manager
    if (result.user) {
      const managerId = (result.user as any)._id ? (result.user as any)._id.toString() : result.user.toString();
      await NotificationService.insertNotification({
        receiver: new Types.ObjectId(managerId),
        title: "Service Request Assigned & Price Set",
        message: `Your service request ${result.requestNo} has been assigned to a service provider. Total charge: $${result.finalPayout || result.basePayment || 0}.`,
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

// 5. Single Unified Update Status Function
const updateStatus = async (
  id: string,
  userId: string,
  role: string,
  status: REQUEST_STATUS,
  payload?: { reason?: string; note?: string; images?: string[] }
) => {
  const request = await ServiceRequestModel.findOne({ _id: id, isDeleted: false });
  if (!request) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Service request not found");
  }

  const managerId = request.user.toString();
  const providerId = request.assignedProvider ? request.assignedProvider.toString() : null;
  const isAdmin = role === ADMIN_ROLES.ADMIN || role === ADMIN_ROLES.SUPER_ADMIN;

  const updateData: Partial<IServiceRequest> = { status };
  if (payload?.note) updateData.note = payload.note;
  if (payload?.images && payload.images.length > 0) updateData.completionImages = payload.images;

  // Validation based on status transition
  if (status === REQUEST_STATUS.ACCEPTED) {
    if (!isAdmin && providerId !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, "Access denied. You are not assigned to this service request.");
    }
  } else if (status === REQUEST_STATUS.REJECTED) {
    if (!isAdmin && providerId !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, "Access denied. You are not assigned to this service request.");
    }
    updateData.rejectionReason = payload?.reason || payload?.note || "Declined by service provider";
  } else if (status === REQUEST_STATUS.IN_PROGRESS) {
    if (!isAdmin && providerId !== userId && managerId !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, "Access denied.");
    }
  } else if (status === REQUEST_STATUS.PENDING_APPROVAL) {
    if (!isAdmin && providerId !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, "Access denied. You are not assigned to this service request.");
    }
  } else if (status === REQUEST_STATUS.COMPLETED) {
    if (!isAdmin && managerId !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, "Access denied. Only the property manager or admin can confirm completion.");
    }

    // Auto-generate invoice upon completion
    try {
      const invoice = await InvoiceServices.createInvoiceFromServiceRequest(request._id);
      if (invoice?._id) {
        updateData.invoice = invoice._id;
      }
    } catch (err) {
      console.error("Failed to auto-generate invoice on completion:", err);
    }
  } else if (status === REQUEST_STATUS.CANCELLED) {
    if (!isAdmin && managerId !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, "Access denied. Only the property manager or admin can cancel.");
    }
  }

  const result = await populateServiceRequestQuery(
    ServiceRequestModel.findByIdAndUpdate(id, updateData, { new: true })
  );

  if (!result) return result;

  // Send relevant notifications based on the new status
  try {
    const admins = await User.find({ role: { $in: [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN] } });

    if (status === REQUEST_STATUS.ACCEPTED) {
      // Notify PM & Admins
      await NotificationService.insertNotification({
        receiver: new Types.ObjectId(managerId),
        title: "Service Request Accepted",
        message: `Service provider accepted your service request ${result.requestNo}.`,
        referenceId: result._id,
        screen: "SERVICE_REQUEST",
        type: "USER",
      });
      for (const admin of admins) {
        await NotificationService.insertNotification({
          receiver: admin._id,
          title: "Service Request Accepted",
          message: `Service provider accepted service request ${result.requestNo}.`,
          referenceId: result._id,
          screen: "SERVICE_REQUEST",
          type: "ADMIN",
        });
      }
    } else if (status === REQUEST_STATUS.REJECTED) {
      // Notify Admins so admin portal shows rejection for reassigning
      for (const admin of admins) {
        await NotificationService.insertNotification({
          receiver: admin._id,
          title: "Service Request Rejected",
          message: `Service provider rejected request ${result.requestNo}. Reason: "${updateData.rejectionReason}". Please reassign to another provider.`,
          referenceId: result._id,
          screen: "SERVICE_REQUEST",
          type: "ADMIN",
        });
      }
    } else if (status === REQUEST_STATUS.IN_PROGRESS) {
      // If PM requested revision
      if (role === USER_ROLES.PROPERTY_MANAGER && providerId) {
        await NotificationService.insertNotification({
          receiver: new Types.ObjectId(providerId),
          title: "Revision Requested",
          message: `Property manager requested revision on request ${result.requestNo}. Note: "${payload?.note || ''}".`,
          referenceId: result._id,
          screen: "SERVICE_REQUEST",
          type: "USER",
        });
      } else {
        // Provider started work
        await NotificationService.insertNotification({
          receiver: new Types.ObjectId(managerId),
          title: "Work Started",
          message: `Work has started on service request ${result.requestNo} ("${result.issueTitle}").`,
          referenceId: result._id,
          screen: "SERVICE_REQUEST",
          type: "USER",
        });
      }
    } else if (status === REQUEST_STATUS.PENDING_APPROVAL) {
      // Notify Property Manager to approve
      await NotificationService.insertNotification({
        receiver: new Types.ObjectId(managerId),
        title: "Work Finished - Approval Required",
        message: `Service provider has completed work on request ${result.requestNo} ("${result.issueTitle}"). Please review and confirm completion.`,
        referenceId: result._id,
        screen: "SERVICE_REQUEST",
        type: "USER",
      });
    } else if (status === REQUEST_STATUS.COMPLETED) {
      // Notify Property Manager
      await NotificationService.insertNotification({
        receiver: new Types.ObjectId(managerId),
        title: "Service Completed & Invoice Ready",
        message: `Service request ${result.requestNo} is completed. Invoice has been generated. Please proceed to payment.`,
        referenceId: result.invoice?._id || result._id,
        screen: "INVOICE",
        type: "USER",
      });

      // Notify Provider
      if (providerId) {
        await NotificationService.insertNotification({
          receiver: new Types.ObjectId(providerId),
          title: "Work Approved & Completed",
          message: `Property manager confirmed completion of service request ${result.requestNo}.`,
          referenceId: result._id,
          screen: "SERVICE_REQUEST",
          type: "USER",
        });
      }
    }
  } catch (error) {
    console.error("Failed to send notification on status update:", error);
  }

  return result;
};

// 6. Delete service request (Soft delete)
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


