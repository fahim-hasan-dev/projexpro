import express from "express";
import { ServiceRequestControllers } from "./serviceRequest.controller";
import { ServiceRequestValidations } from "./serviceRequest.validation";
import auth from "../../middleware/auth";
import requireApproval from "../../middleware/requireApproval";
import validateRequest from "../../middleware/validateRequest";
import { fileAndBodyProcessorUsingDiskStorage } from "../../middleware/processReqBody";
import { USER_ROLES, ADMIN_ROLES } from "../../../enum/user";

const router = express.Router();

router.post(
  "/create",
  auth(USER_ROLES.PROPERTY_MANAGER),
  requireApproval,
  fileAndBodyProcessorUsingDiskStorage(),
  validateRequest(ServiceRequestValidations.createServiceRequestZod),
  ServiceRequestControllers.createServiceRequest
);

router.get(
  "/",
  auth(USER_ROLES.PROPERTY_MANAGER, USER_ROLES.SERVICE_PROVIDER, ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  requireApproval,
  ServiceRequestControllers.getAllServiceRequests
);

router.get(
  "/:id",
  auth(USER_ROLES.PROPERTY_MANAGER, USER_ROLES.SERVICE_PROVIDER, ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  requireApproval,
  ServiceRequestControllers.getSingleServiceRequest
);

// Admin assigns contractor, base payout & specialized rates
router.patch(
  "/assign/:id",
  auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validateRequest(ServiceRequestValidations.assignAndPayoutZod),
  ServiceRequestControllers.assignAndSetPayout
);

// Update status (Provider / Manager / Admin)
router.patch(
  "/status/:id",
  auth(USER_ROLES.PROPERTY_MANAGER, USER_ROLES.SERVICE_PROVIDER, ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  requireApproval,
  validateRequest(ServiceRequestValidations.updateStatusZod),
  ServiceRequestControllers.updateStatus
);

router.delete(
  "/:id",
  auth(USER_ROLES.PROPERTY_MANAGER, ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  requireApproval,
  ServiceRequestControllers.deleteServiceRequest
);

export const ServiceRequestRoutes = router;
