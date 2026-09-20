import { z } from "zod";
import { REQUEST_PRIORITY, REQUEST_STATUS, SPECIALIZED_PAYMENT_TYPE } from "./serviceRequest.interface";

export const createServiceRequestZod = z.object({
  body: z.object({
    property: z.string({ required_error: "Property is required" }),
    issueTitle: z.string({ required_error: "Issue title is required" }).min(1, "Issue title is required"),
    description: z.string({ required_error: "Description is required" }).min(1, "Description is required"),
    priority: z.nativeEnum(REQUEST_PRIORITY).optional(),
    isOccupied: z.boolean().or(z.string().transform((val) => val === "true")).default(false),
    tenantName: z.string().optional(),
    tenantPhone: z.string().optional(),
    locationDetails: z.string().optional(),
    images: z.array(z.string()).or(z.string().transform((val) => [val])).optional(),
  }),
});

export const assignAndPayoutZod = z.object({
  body: z.object({
    assignedProvider: z.string().optional(),
    basePayment: z.number().or(z.string().transform((val) => Number(val))).optional(),
    specializedRate: z
      .object({
        isActive: z.boolean().optional(),
        paymentType: z.nativeEnum(SPECIALIZED_PAYMENT_TYPE).optional(),
        value: z.number().or(z.string().transform((val) => Number(val))).optional(),
        reason: z.string().optional(),
      })
      .optional(),
    eta: z.string().or(z.date()).optional(),
    status: z.nativeEnum(REQUEST_STATUS).optional(),
  }),
});

export const updateStatusZod = z.object({
  body: z.object({
    status: z.nativeEnum(REQUEST_STATUS, { required_error: "Status is required" }),
  }),
});

export const ServiceRequestValidations = {
  createServiceRequestZod,
  assignAndPayoutZod,
  updateStatusZod,
};
