import { JwtPayload } from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import { ISubscription } from "./subscription.interface";
import { Subscription } from "./subscription.model";
import stripe from "../../../config/stripe";
import { User } from "../user/user.model";
import { Plan } from "../plan/plan.model";
import QueryBuilder from "../../builder/QueryBuilder";

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

    if (subscription.subscriptionId) {
        try {
            const subscriptionFromStripe = await stripe.subscriptions.retrieve(subscription.subscriptionId);

            // Check subscription status and update database accordingly
            if (subscriptionFromStripe?.status !== "active") {
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

    return subscription;
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
                select: "firstName lastName email image role profile totalUnitsUsed"
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

    const updatedStripeSub = (await stripe.subscriptions.update(subscriptionId, {
        items: [
            {
                id: subscriptionItemId,
                price: newPlan.priceId,
            },
        ],
        proration_behavior: "always_invoice",
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

export const SubscriptionService = {
    subscriptionDetailsFromDB,
    subscriptionsFromDB,
    cancelSubscription,
    toggleAutoRenew,
    upgradeSubscription,
};
