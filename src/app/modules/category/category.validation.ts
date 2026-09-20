import { z } from "zod";

export const createCategoryZod = z.object({
  body: z.object({
    name: z.string({ required_error: "Category name is required" }).min(1, "Category name is required"),
    parent: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
  }),
});

export const updateCategoryZod = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    parent: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
  }),
});

export const CategoryValidations = {
  createCategoryZod,
  updateCategoryZod,
};
