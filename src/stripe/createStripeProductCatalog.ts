import { StatusCodes } from "http-status-codes";
import stripe from "../config/stripe";
import { IPlan } from "../app/modules/plan/plan.interface";
import ApiError from "../errors/ApiError";

export const createStripeProductCatalog = async (
    payload: Partial<IPlan>
): Promise<{ productId: string; priceId: string } | null> => {
    // Create Product in Stripe
    const product = await stripe.products.create({
        name: payload.title as string,
        description: payload.description as string,
    });

    // Determine interval based on duration
    let interval: "month" | "year" = "month";
    let intervalCount = 1;

    switch (payload.duration) {
        case "1 month":
            interval = "month";
            intervalCount = 1;
            break;
        case "3 months":
            interval = "month";
            intervalCount = 3;
            break;
        case "6 months":
            interval = "month";
            intervalCount = 6;
            break;
        case "1 year":
            interval = "year";
            intervalCount = 1;
            break;
    }

    // Build basic price data
    const priceData: any = {
        product: product.id,
        currency: "usd",
        recurring: { interval, interval_count: intervalCount },
    };

    if (payload.unitPrice && payload.minimumPrice) {
        // Implement Stripe Tiered Pricing (Volume)
        const unitPriceCents = Math.round(Number(payload.unitPrice) * 100);
        const minAmountCents = Math.round(Number(payload.minimumPrice) * 100);
        
        // Calculate the maximum quantity that falls under the minimum flat fee
        const tier1UpTo = Math.floor(minAmountCents / unitPriceCents);

        priceData.billing_scheme = "tiered";
        priceData.tiers_mode = "volume";
        priceData.tiers = [
            {
                up_to: tier1UpTo,
                flat_amount: minAmountCents,
            },
            {
                up_to: "inf",
                unit_amount: unitPriceCents,
            },
        ];
    } else {
        // Fallback for standard fixed pricing
        priceData.unit_amount = Math.round(Number(payload.price || 0) * 100);
    }

    // Create Price for the Product
    const price = await stripe.prices.create(priceData);

    if (!price) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to create Stripe price");
    }

    return { productId: product.id, priceId: price.id };
};
