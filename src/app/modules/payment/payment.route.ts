import { Router } from "express";
import { PaymentController } from "./payment.controller";
import auth from "../../middleware/auth";
import { ADMIN_ROLES, USER_ROLES } from "../../../enum/user";
import express from "express";

const router = Router();



router.post(
    "/checkout-session/:referenceId",
    PaymentController.createCheckoutSession
)

router.get(
    "/",
    auth(ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN),
    PaymentController.getPaymentsController
)
router.get(
    "/:id",
    auth(ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN),
    PaymentController.getPaymentByIdController
)



export const PaymentRoutes = router;
