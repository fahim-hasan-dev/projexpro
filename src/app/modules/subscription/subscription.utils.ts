import stripe from "../../../config/stripe";
import { User } from "../user/user.model";
import { logger } from "../../../shared/logger";

export const syncStripeSubscriptionQuantity = async (userId: string, newTotalUnits: number) => {
    try {
        const user = await User.findById(userId);
        const subscriptionId = user?.subscription?.subscriptionId;

        // Skip if user has no Stripe subscription ID
        if (!subscriptionId) return;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        if (subscription.status !== "active" && subscription.status !== "trialing") return;

        const subscriptionItemId = subscription.items.data[0]?.id;
        if (!subscriptionItemId) return;

        // Ensure minimum quantity is 1 (if no active units, default to 1 to keep subscription active)
        const quantity = newTotalUnits > 0 ? newTotalUnits : 1;

        // Update quantity without proration
        await stripe.subscriptionItems.update(subscriptionItemId, {
            quantity,
            proration_behavior: "none",
        });

        logger.info(`Synced Stripe subscription quantity to ${quantity} for user ${userId}`);
    } catch (error) {
        logger.error(`Failed to sync Stripe subscription quantity for user ${userId}:`, error);
    }
};
