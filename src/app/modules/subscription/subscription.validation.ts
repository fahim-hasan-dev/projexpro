import { z } from 'zod';

export const cancelSubscriptionZodSchema = z.object({
  body: z.object({
    cancelImmediately: z.boolean().optional(),
  }),
});

export const toggleAutoRenewZodSchema = z.object({
  body: z.object({
    autoRenew: z.boolean({ required_error: "autoRenew boolean is required" }),
  }),
});

export const upgradeSubscriptionZodSchema = z.object({
  body: z.object({
    newPlanId: z.string({ required_error: "newPlanId is required" }),
  }),
});

export const SubscriptionValidation = {
  cancelSubscriptionZodSchema,
  toggleAutoRenewZodSchema,
  upgradeSubscriptionZodSchema,
};
