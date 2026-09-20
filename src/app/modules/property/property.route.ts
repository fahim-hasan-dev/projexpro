import express from "express";
import { PropertyControllers } from "./property.controller";
import { PropertyValidations } from "./property.validation";
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
  validateRequest(PropertyValidations.createPropertyZod),
  PropertyControllers.createProperty
);

router.get(
  "/my-properties",
  auth(USER_ROLES.PROPERTY_MANAGER),
  requireApproval,
  PropertyControllers.getMyProperties
);

router.get(
  "/",
  auth(USER_ROLES.PROPERTY_MANAGER, ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  requireApproval,
  PropertyControllers.getAllProperties
);

router.get(
  "/:id",
  auth(USER_ROLES.PROPERTY_MANAGER, ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  requireApproval,
  PropertyControllers.getSingleProperty
);

router.patch(
  "/:id",
  auth(USER_ROLES.PROPERTY_MANAGER, ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  requireApproval,
  fileAndBodyProcessorUsingDiskStorage(),
  validateRequest(PropertyValidations.updatePropertyZod),
  PropertyControllers.updateProperty
);

router.delete(
  "/:id",
  auth(USER_ROLES.PROPERTY_MANAGER, ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  requireApproval,
  PropertyControllers.deleteProperty
);

export const PropertyRoutes = router;
