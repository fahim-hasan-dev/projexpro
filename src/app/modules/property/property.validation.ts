import { z } from "zod";
import { PROPERTY_STATUS } from "./property.interface";

export const createPropertyZod = z.object({
  body: z.object({
    category: z.string({ required_error: "Property category is required" }),
    subCategory: z.string({ required_error: "Property sub-category is required" }),
    name: z.string({ required_error: "Property name is required" }).min(1, "Property name is required"),
    address: z.string({ required_error: "Property address is required" }).min(1, "Property address is required"),
    unitSuiteNo: z.string().optional(),
    totalUnits: z.number().or(z.string().transform((val) => Number(val))).optional().nullable(),
    floorRange: z.string().optional(),
    status: z.nativeEnum(PROPERTY_STATUS).optional(),
    coverPhoto: z.string().optional(),
  }),
});

export const updatePropertyZod = z.object({
  body: z.object({
    category: z.string().optional(),
    subCategory: z.string().optional(),
    name: z.string().min(1).optional(),
    address: z.string().min(1).optional(),
    unitSuiteNo: z.string().optional(),
    totalUnits: z.number().or(z.string().transform((val) => Number(val))).optional().nullable(),
    floorRange: z.string().optional(),
    status: z.nativeEnum(PROPERTY_STATUS).optional(),
    coverPhoto: z.string().optional(),
  }),
});

export const PropertyValidations = {
  createPropertyZod,
  updatePropertyZod,
};
