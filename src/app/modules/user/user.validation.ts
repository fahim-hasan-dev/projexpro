import { z } from "zod";
import { USER_ROLES, USER_STATUS } from "./user.interface";

export const propertyManagerProfileSchema = z.object({
  contactFullName: z.string().optional(),
  jobTitle: z.string().optional(),
  businessEmail: z.string().email("Invalid business email").optional(),
  businessPhone: z.string().optional(),
  companyName: z.string().optional(),
  legalBusinessName: z.string().optional(),
  dbaTradeName: z.string().optional(),
  companyWebsiteUrl: z.string().optional(),
  businessAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  taxId: z.string().optional(),
  portfolioSize: z.string().optional(),
  maintenanceInfrastructure: z.string().optional(),
  propertyTypes: z.array(z.string()).optional(),
});

export const serviceProviderProfileSchema = z.object({
  streetAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  bio: z.string().optional(),
  skills: z.array(z.string()).optional(),
  companyName: z.string().optional(),
  officeAddress: z.string().optional(),
  officeCity: z.string().optional(),
  officeState: z.string().optional(),
  officeZipCode: z.string().optional(),
  officePhone: z.string().optional(),
  taxId: z.string().optional(),
  yearsInBusiness: z.number().optional(),
  licenses: z.array(z.object({
    licenseType: z.string().optional(),
    licenseNumber: z.string().optional(),
    dateIssued: z.union([z.string(), z.date()]).optional(),
    stateIssued: z.string().optional(),
    licenseDocument: z.string().optional(),
  })).optional(),
  governmentId: z.string().optional(),
  proofOfInsurance: z.string().optional(),
  documents: z.array(z.object({
    title: z.string(),
    fileUrl: z.string(),
    type: z.string().optional(),
  })).optional(),
  isAccountPaused: z.boolean().optional(),
});

export const userSignupSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    username: z.string().min(1, "Username is required").optional(),
    email: z.string().email("Invalid email address").toLowerCase().trim(),
    contactNumber: z.string().optional(),
    phone: z.string().optional(),
    password: z.string().min(6, "Password must be at least 6 characters"),
    role: z.nativeEnum(USER_ROLES).optional(),
    propertyManagerProfile: propertyManagerProfileSchema.optional(),
    serviceProviderProfile: serviceProviderProfileSchema.optional(),
    profile: z.record(z.any()).optional(),
  })
});

export const userLoginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address").toLowerCase().trim(),
    password: z.string().min(1, "Password is required"),
  })
});

export const userUpdateSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address").trim().toLowerCase().optional(),
    firstName: z.string().min(1, "First name is required").optional(),
    lastName: z.string().min(1, "Last name is required").optional(),
    username: z.string().min(1, "Username is required").optional(),
    contactNumber: z.string().optional(),
    phone: z.string().optional(),
    image: z.string().url("Invalid image URL").optional(),
    password: z.string().min(6, "Password must be at least 6 characters").optional(),
    status: z.nativeEnum(USER_STATUS).optional(),
    verified: z.boolean().optional(),
    role: z.nativeEnum(USER_ROLES).optional(),
    propertyManagerProfile: propertyManagerProfileSchema.optional(),
    serviceProviderProfile: serviceProviderProfileSchema.optional(),
    profile: z.record(z.any()).optional(),
  })
});

export const updatePropertyManagerProfileSchema = z.object({
  body: propertyManagerProfileSchema
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
  })
});

export const UserValidations = {
  userSignupSchema,
  userLoginSchema,
  userUpdateSchema,
  updatePropertyManagerProfileSchema,
  changePasswordSchema,
};

