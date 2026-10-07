import { JwtPayload } from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import { ISubscription } from "./subscription.interface";
import { Subscription } from "./subscription.model";
import stripe from "../../../config/stripe";
import Stripe from "stripe";
import { User } from "../user/user.model";
import { Plan } from "../plan/plan.model";
import QueryBuilder from "../../builder/QueryBuilder";
import config from "../../../config";

const subscriptionDetailsFromDB = async (userPayload: JwtPayload): Promise<ISubscription | Record<string, unknown>> => {
    const userId = userPayload.authId || userPayload.id;

    const subscription = await Subscription.findOne({ user: userId, status: "active" })
        .populate("plan", "title price duration paymentType features maxUnits")
        .sort({ createdAt: -1 })
        .lean();

    if (!subscription) {
        // Fallback: check any latest subscription if active one not found
        const latestSub = await Subscription.findOne({ user: userId })
            .populate("plan", "title price duration paymentType features maxUnits")
            .sort({ createdAt: -1 })
            .lean();
        if (!latestSub) return {};
        return latestSub;
    }

    let paymentMethod = null;
    if (subscription.subscriptionId) {
        try {
            const subscriptionFromStripe = await stripe.subscriptions.retrieve(subscription.subscriptionId, { 
                expand: ['default_payment_method'] 
            });

            // Extract payment method details from subscription
            if (subscriptionFromStripe.default_payment_method && typeof subscriptionFromStripe.default_payment_method !== 'string') {
                const pm = subscriptionFromStripe.default_payment_method as Stripe.PaymentMethod;
                paymentMethod = {
                    brand: pm.card?.brand,
                    last4: pm.card?.last4,
                    expMonth: pm.card?.exp_month,
                    expYear: pm.card?.exp_year,
                };
            } else if (subscriptionFromStripe.customer) {
                // If not set on subscription, check customer default
                const customer = await stripe.customers.retrieve(subscriptionFromStripe.customer as string, { 
                    expand: ['invoice_settings.default_payment_method'] 
                }) as Stripe.Customer;
                
                if (customer.invoice_settings?.default_payment_method && typeof customer.invoice_settings.default_payment_method !== 'string') {
                    const pm = customer.invoice_settings.default_payment_method as Stripe.PaymentMethod;
                    paymentMethod = {
                        brand: pm.card?.brand,
                        last4: pm.card?.last4,
                        expMonth: pm.card?.exp_month,
                        expYear: pm.card?.exp_year,
                    };
                }
            }

            // Check subscription status and update database accordingly
            if (subscriptionFromStripe?.status !== "active" && subscriptionFromStripe?.status !== "past_due" && subscriptionFromStripe?.status !== "trialing") {
                await Promise.all([
                    User.findByIdAndUpdate(userId, { subscribe: false, 'subscription.status': 'expired' }, { new: true }),
                    Subscription.findByIdAndUpdate(subscription._id, { status: "expired" }, { new: true })
                ]);
                subscription.status = "expired";
            }
        } catch (error) {
            console.error("Stripe subscription check failed:", error);
        }
    }

    return { ...subscription, paymentMethod };
};

const subscriptionsFromDB = async (query: Record<string, unknown>) => {
    const result = new QueryBuilder(Subscription.find(), query).paginate();
    const subscriptions = await result.modelQuery
        .populate([
            {
                path: "plan",
                select: "title price duration paymentType maxUnits"
            },
            {
                path: "user",
                select: "firstName lastName userName email phone image role totalUnitsUsed"
            }
        ])
        .select("-createdAt -updatedAt -__v")
        .lean();
    const pagination = await result.getPaginationInfo();

    return { subscriptions, pagination };
};

// Cancel Subscription (Immediate or at Period End)
const cancelSubscription = async (userPayload: JwtPayload, cancelImmediately: boolean = false) => {
    const userId = userPayload.authId || userPayload.id;

    const user = await User.findById(userId);
    if (!user) throw new ApiError(StatusCodes.NOT_FOUND, "User not found");

    const subscription = await Subscription.findOne({ user: userId, status: { $in: ["active", "cancel"] } })
        .sort({ createdAt: -1 });

    const subscriptionId = subscription?.subscriptionId || user?.subscription?.subscriptionId;
    if (!subscriptionId) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "No active subscription found to cancel.");
    }

    if (cancelImmediately) {
        await stripe.subscriptions.cancel(subscriptionId);

        await User.findByIdAndUpdate(userId, {
            subscribe: false,
            "subscription.status": "cancel",
        });

        if (subscription) {
            await Subscription.findByIdAndUpdate(subscription._id, { status: "cancel" });
        }

        return {
            message: "Subscription has been canceled immediately.",
            status: "cancel",
        };
    } else {
        const stripeSub = (await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
        })) as any;

        const currentPeriodEnd = stripeSub.current_period_end
            ? new Date(stripeSub.current_period_end * 1000)
            : subscription?.currentPeriodEnd || user.subscription?.currentPeriodEnd;

        await User.findByIdAndUpdate(userId, {
            "subscription.status": "cancel_at_period_end",
        });

        if (subscription) {
            await Subscription.findByIdAndUpdate(subscription._id, { status: "cancel" });
        }

        return {
            message: `Subscription auto-renewal turned off. It will remain active until ${currentPeriodEnd ? currentPeriodEnd.toISOString().split('T')[0] : 'period end'}.`,
            status: "cancel_at_period_end",
            currentPeriodEnd,
        };
    }
};

// Toggle Auto Renew (ON/OFF)
const toggleAutoRenew = async (userPayload: JwtPayload, autoRenew: boolean) => {
    const userId = userPayload.authId || userPayload.id;

    const user = await User.findById(userId);
    if (!user) throw new ApiError(StatusCodes.NOT_FOUND, "User not found");

    const subscription = await Subscription.findOne({ user: userId, status: { $in: ["active", "cancel"] } })
        .sort({ createdAt: -1 });

    const subscriptionId = subscription?.subscriptionId || user?.subscription?.subscriptionId;
    if (!subscriptionId) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "No active subscription found.");
    }

    const stripeSub = (await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: !autoRenew,
    })) as any;

    const currentPeriodEnd = stripeSub.current_period_end
        ? new Date(stripeSub.current_period_end * 1000)
        : subscription?.currentPeriodEnd || user.subscription?.currentPeriodEnd;

    const status = autoRenew ? "active" : "cancel_at_period_end";

    await User.findByIdAndUpdate(userId, {
        "subscription.status": status,
    });

    if (subscription) {
        await Subscription.findByIdAndUpdate(subscription._id, {
            status: autoRenew ? "active" : "cancel",
        });
    }

    return {
        autoRenew,
        status,
        currentPeriodEnd,
        message: autoRenew
            ? "Auto-renewal turned ON successfully. Your subscription will renew automatically."
            : `Auto-renewal turned OFF successfully. Your subscription will end on ${currentPeriodEnd ? currentPeriodEnd.toISOString().split('T')[0] : 'period end'}.`,
    };
};

// Upgrade or Downgrade Subscription Plan
const upgradeSubscription = async (userPayload: JwtPayload, newPlanId: string) => {
    const userId = userPayload.authId || userPayload.id;

    const user = await User.findById(userId);
    if (!user) throw new ApiError(StatusCodes.NOT_FOUND, "User not found");

    const activeSub = await Subscription.findOne({ user: userId, status: "active" })
        .sort({ createdAt: -1 });

    const subscriptionId = activeSub?.subscriptionId || user?.subscription?.subscriptionId;
    if (!subscriptionId) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "No active subscription found to upgrade. Please subscribe first.");
    }

    const newPlan = await Plan.findById(newPlanId);
    if (!newPlan) throw new ApiError(StatusCodes.NOT_FOUND, "Selected plan not found");
    if (!newPlan.priceId) throw new ApiError(StatusCodes.BAD_REQUEST, "Selected plan is missing a Stripe priceId");

    // Check unit limit before upgrading/changing plan
    if (newPlan.maxUnits !== undefined && newPlan.maxUnits > 0) {
        const currentUnitsUsed = user.totalUnitsUsed || 0;
        if (currentUnitsUsed > newPlan.maxUnits) {
            throw new ApiError(
                StatusCodes.BAD_REQUEST,
                `Cannot switch to this plan. You currently use ${currentUnitsUsed} units, which exceeds the target plan limit of ${newPlan.maxUnits} units.`
            );
        }
    }

    const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
    const subscriptionItemId = stripeSub.items.data[0]?.id;

    if (!subscriptionItemId) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Subscription item not found in Stripe");
    }

    const initialQuantity = user.profile?.activeUnits && user.profile.activeUnits > 0 
        ? user.profile.activeUnits 
        : (user.profile?.portfolioSize || 1);

    const updatedStripeSub = (await stripe.subscriptions.update(subscriptionId, {
        items: [
            {
                id: subscriptionItemId,
                price: newPlan.priceId,
                quantity: initialQuantity,
            },
        ],
        proration_behavior: "none", // Prevent mid-month invoices
        cancel_at_period_end: false,
    })) as any;

    const currentPeriodStart = new Date(updatedStripeSub.current_period_start * 1000);
    const currentPeriodEnd = new Date(updatedStripeSub.current_period_end * 1000);

    await User.findByIdAndUpdate(userId, {
        subscribe: true,
        subscription: {
            plan: newPlan._id,
            subscriptionId,
            status: "active",
            currentPeriodStart,
            currentPeriodEnd,
        },
    });

    if (activeSub) {
        await Subscription.findByIdAndUpdate(activeSub._id, {
            plan: newPlan._id,
            price: newPlan.price,
            status: "active",
            currentPeriodStart,
            currentPeriodEnd,
        });
    } else {
        await Subscription.create({
            user: user._id,
            customerId: stripeSub.customer as string,
            price: newPlan.price,
            plan: newPlan._id,
            subscriptionId,
            status: "active",
            currentPeriodStart,
            currentPeriodEnd,
        });
    }

    return {
        message: "Subscription plan updated successfully",
        plan: newPlan,
        currentPeriodStart,
        currentPeriodEnd,
    };
};

// Create Stripe Customer Portal Session
const createCustomerPortalSession = async (userPayload: JwtPayload) => {
    const userId = userPayload.authId || userPayload.id;

    const user = await User.findById(userId);
    if (!user) throw new ApiError(StatusCodes.NOT_FOUND, "User not found");

    const activeSub = await Subscription.findOne({ user: userId })
        .sort({ createdAt: -1 });

    const subscriptionId = activeSub?.subscriptionId || user?.subscription?.subscriptionId;
    if (!subscriptionId) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "No active subscription found for this user.");
    }

    const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
    const stripeCustomerId = stripeSub.customer as string;

    const session = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: config.stripe.frontendUrl || config.frontend_url || "http://localhost:3000",
    });

    return { url: session.url };
};

export const SubscriptionService = {
    subscriptionDetailsFromDB,
    subscriptionsFromDB,
    cancelSubscription,
    toggleAutoRenew,
    upgradeSubscription,
    createCustomerPortalSession,
};
