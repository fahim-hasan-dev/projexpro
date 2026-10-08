import express from "express";
import { SubscriptionController } from "./subscription.controller";
import auth from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import { ADMIN_ROLES, USER_ROLES } from "../../../enum/user";
import { SubscriptionValidation } from "./subscription.validation";

const router = express.Router();

router.get("/",
    auth(ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN),
    SubscriptionController.subscriptions
);

router.get("/my-plan",
    auth(USER_ROLES.PROPERTY_MANAGER, USER_ROLES.SERVICE_PROVIDER),
    SubscriptionController.subscriptionDetails
);

router.post("/cancel",
    auth(USER_ROLES.PROPERTY_MANAGER, USER_ROLES.SERVICE_PROVIDER),
    validateRequest(SubscriptionValidation.cancelSubscriptionZodSchema),
    SubscriptionController.cancelSubscription
);

router.post("/toggle-auto-renew",
    auth(USER_ROLES.PROPERTY_MANAGER, USER_ROLES.SERVICE_PROVIDER),
    validateRequest(SubscriptionValidation.toggleAutoRenewZodSchema),
    SubscriptionController.toggleAutoRenew
);

router.post("/upgrade",
    auth(USER_ROLES.PROPERTY_MANAGER, USER_ROLES.SERVICE_PROVIDER),
    validateRequest(SubscriptionValidation.upgradeSubscriptionZodSchema),
    SubscriptionController.upgradeSubscription
);

router.post("/billing-portal",
    auth(USER_ROLES.PROPERTY_MANAGER, USER_ROLES.SERVICE_PROVIDER),
    SubscriptionController.generateBillingPortal
);

// Enterprise Routes
router.post("/enterprise/request",
    auth(USER_ROLES.PROPERTY_MANAGER, USER_ROLES.SERVICE_PROVIDER),
    SubscriptionController.createEnterpriseRequest
);

router.get("/enterprise/requests",
    auth(ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN),
    SubscriptionController.getEnterpriseRequests
);

router.post("/enterprise/approve/:id",
    auth(ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN),
    SubscriptionController.approveEnterpriseRequest
);

router.post("/enterprise/reject/:id",
    auth(ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN),
    SubscriptionController.rejectEnterpriseRequest
);

export const SubscriptionRoutes = router;