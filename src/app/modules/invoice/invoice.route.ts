import express from "express";
import { InvoiceControllers } from "./invoice.controller";
import { InvoiceValidations } from "./invoice.validation";
import auth from "../../middleware/auth";
import requireApproval from "../../middleware/requireApproval";
import validateRequest from "../../middleware/validateRequest";
import { USER_ROLES, ADMIN_ROLES } from "../../../enum/user";

const router = express.Router();

router.post(
  "/create",
  auth(USER_ROLES.PROPERTY_MANAGER, ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  requireApproval,
  validateRequest(InvoiceValidations.createInvoiceZodSchema),
  InvoiceControllers.createInvoice
);

router.post(
  "/:id/pay",
  auth(USER_ROLES.PROPERTY_MANAGER),
  requireApproval,
  InvoiceControllers.payInvoice
);

router.get(
  "/my-invoices",
  auth(USER_ROLES.PROPERTY_MANAGER),
  requireApproval,
  InvoiceControllers.getMyInvoices
);

router.get(
  "/admin/all",
  auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  InvoiceControllers.getAllInvoices
);

router.get(
  "/service-request/:serviceRequestId",
  auth(USER_ROLES.PROPERTY_MANAGER, USER_ROLES.SERVICE_PROVIDER, ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  requireApproval,
  InvoiceControllers.getInvoiceByServiceRequest
);

router.get(
  "/:id",
  auth(USER_ROLES.PROPERTY_MANAGER, USER_ROLES.SERVICE_PROVIDER, ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  requireApproval,
  InvoiceControllers.getSingleInvoice
);

export const InvoiceRoutes = router;
