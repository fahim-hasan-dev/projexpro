import { z } from "zod";

export const createInvoiceZodSchema = z.object({
  body: z.object({
    serviceRequestId: z.string({ required_error: "serviceRequestId is required" }),
  }),
});

export const payInvoiceZodSchema = z.object({
  body: z.object({
    invoiceId: z.string({ required_error: "invoiceId is required" }).optional(),
  }),
});

export const InvoiceValidations = {
  createInvoiceZodSchema,
  payInvoiceZodSchema,
};
