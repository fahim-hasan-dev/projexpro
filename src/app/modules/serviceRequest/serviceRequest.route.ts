import express from "express";
import { ServiceRequestControllers } from "./serviceRequest.controller";
import { ServiceRequestValidations } from "./serviceRequest.validation";
import auth from "../../middleware/auth";
import requireApproval from "../../middleware/requireApproval";
import validateRequest from "../../middleware/validateRequest";
import { fileAndBodyProcessorUsingDiskStorage } from "../../middleware/processReqBody";
import { USER_ROLES, ADMIN_ROLES } from "../../../enum/user";

const router = express.Router();

// 1. Property Manager creates request
router.post(
  "/create",
  auth(USER_ROLES.PROPERTY_MANAGER),
  requireApproval,
  fileAndBodyProcessorUsingDiskStorage(),
  validateRequest(ServiceRequestValidations.createServiceRequestZod),
  ServiceRequestControllers.createServiceRequest
);

// Get All Service Requests (Filterable by role & query, e.g. ?status=Rejected for Admin)
router.get(
  "/",
  auth(USER_ROLES.PROPERTY_MANAGER, USER_ROLES.SERVICE_PROVIDER, ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  requireApproval,
  ServiceRequestControllers.getAllServiceRequests
);

// Get Single Service Request
router.get(
  "/:id",
  auth(USER_ROLES.PROPERTY_MANAGER, USER_ROLES.SERVICE_PROVIDER, ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  requireApproval,
  ServiceRequestControllers.getSingleServiceRequest
);

// 2. Admin assigns contractor / provider & sets payout charge (Initial assign or Reassign after rejection)
router.patch(
  "/assign/:id",
  auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validateRequest(ServiceRequestValidations.assignAndPayoutZod),
  ServiceRequestControllers.assignAndSetPayout
);

// Single Update Request Status API (Provider / Manager / Admin)
router.patch(
  "/status/:id",
  auth(USER_ROLES.PROPERTY_MANAGER, USER_ROLES.SERVICE_PROVIDER, ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  requireApproval,
  fileAndBodyProcessorUsingDiskStorage(),
  validateRequest(ServiceRequestValidations.updateStatusZod),
  ServiceRequestControllers.updateStatus
);

// Delete Service Request (Soft delete)
router.delete(
  "/:id",
  auth(USER_ROLES.PROPERTY_MANAGER, ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  requireApproval,
  ServiceRequestControllers.deleteServiceRequest
);

export const ServiceRequestRoutes = router;


