import { z } from "zod";
import { APPROVAL_STATUS, ADMIN_ROLES, USER_STATUS } from "../../../enum/user";

export const createAdminZodSchema = z.object({
  body: z.object({
    firstName: z.string({ required_error: "First name is required" }),
    lastName: z.string({ required_error: "Last name is required" }),
    email: z.string({ required_error: "Email is required" }).email("Invalid email address").toLowerCase().trim(),
    password: z.string({ required_error: "Password is required" }).min(6, "Password must be at least 6 characters"),
    contactNumber: z.string().optional(),
    phone: z.string().optional(),
    role: z.nativeEnum(ADMIN_ROLES).optional(),
  }),
});

export const updateAdminZodSchema = z.object({
  body: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().email().optional(),
    contactNumber: z.string().optional(),
    phone: z.string().optional(),
    image: z.string().optional(),
    status: z.nativeEnum(USER_STATUS).optional(),
    role: z.nativeEnum(ADMIN_ROLES).optional(),
  }),
});

export const manageUserApprovalZodSchema = z.object({
  body: z.object({
    approvalStatus: z.nativeEnum(APPROVAL_STATUS, {
      required_error: "Approval status is required (approved, rejected, or pending)",
    }),
    rejectionReason: z.string().optional(),
  }),
});

export const managePropertyManagerApprovalZodSchema = manageUserApprovalZodSchema;

export const AdminValidations = {
  createAdminZodSchema,
  updateAdminZodSchema,
  manageUserApprovalZodSchema,
  managePropertyManagerApprovalZodSchema,
};
