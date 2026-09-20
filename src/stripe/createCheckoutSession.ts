import stripe from "../config/stripe";
import { User } from "../app/modules/user/user.model";
import { Plan } from "../app/modules/plan/plan.model";
import { StatusCodes } from "http-status-codes";
import config from "../config";
import { JwtPayload } from "jsonwebtoken";
import ApiError from "../errors/ApiError";

export const createCheckoutSession = async (userdata: JwtPayload, planId: string) => {
    const userId = userdata.authId || userdata.id;

    const user = await User.findById(userId);
    if (!user) throw new ApiError(StatusCodes.NOT_FOUND, "User not found");

    const plan = await Plan.findById(planId);
    if (!plan) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Plan not found!");
    }

    if (!plan.priceId) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Selected plan is missing a Stripe priceId");
    }

    const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [
            {
                price: plan.priceId,
                quantity: 1,
            },
        ],
        customer_email: user.email,
        subscription_data: {
            metadata: {
                planId: plan._id.toString(),
                userId: user._id.toString(),
            },
        },
        success_url: `${config.stripe.frontendUrl}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${config.stripe.frontendUrl}/payments/cancel`,
        metadata: {
            planId: plan._id.toString(),
            userId: user._id.toString(),
        },
    });

    return session.url;
};
