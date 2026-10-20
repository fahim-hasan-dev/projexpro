import { z } from 'zod';

export const createPlanZodValidationSchema = z.object({
    body: z.object({
        title: z.string({ required_error: "Title is required" }),
        description: z.string({ required_error: "Description is required" }),
        planType: z.enum(['prime', 'pro', 'enterprise'], { required_error: "Plan type is required" }),
        unitPrice: z.number({ required_error: "Unit price is required" }),
        minimumPrice: z.number({ required_error: "Minimum price is required" }),
        price: z.number().optional().nullable(),
        duration: z.enum(["1 month", "3 months", "6 months", "1 year"], { required_error: "Duration is required" }),
        paymentType: z.enum(["Monthly", "Yearly"], { required_error: "Payment type is required" }),
        maxUnits: z.number().optional().nullable(),
        features: z.array(z.string({ required_error: "Feature is required" }), { required_error: "Features are required" }),
    })
});

// update plan zod validation schema
export const updatePlanZodValidationSchema = z.object({
    body: z.object({
        title: z.string({ required_error: "Title is required" }).optional(),
        description: z.string({ required_error: "Description is required" }).optional(),
        planType: z.enum(['prime', 'pro', 'enterprise']).optional(),
        price: z.number().optional().nullable(),
        unitPrice: z.number().optional().nullable(),
        minimumPrice: z.number().optional().nullable(),
        duration: z.enum(["1 month", "3 months", "6 months", "1 year"], { required_error: "Duration is required" }).optional(),
        paymentType: z.enum(["Monthly", "Yearly"], { required_error: "Payment type is required" }).optional(),
        maxUnits: z.number().optional().nullable(),
        features: z.array(z.string({ required_error: "Feature is required" }), { required_error: "Features are required" }).optional(),
    })
});
