import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import QueryBuilder from "../../builder/QueryBuilder";
import { IProperty } from "./property.interface";
import { PropertyModel } from "./property.model";
import { CategoryModel } from "../category/category.model";

// Create property (Property Manager only)
const createProperty = async (userId: string, payload: IProperty) => {
  // Verify category & subCategory existence
  const categoryExists = await CategoryModel.findById(payload.category);
  if (!categoryExists) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Category not found");
  }

  const subCategoryExists = await CategoryModel.findById(payload.subCategory);
  if (!subCategoryExists) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Sub-category not found");
  }

  payload.user = userId as any;

  const result = await PropertyModel.create(payload);
  return result;
};

// Get all properties with filtering, search, pagination
const getAllProperties = async (query: Record<string, unknown>, userId?: string, isManagerOnly: boolean = false) => {
  const searchFields = ["name", "address", "unitSuiteNo", "floorRange"];
  let baseQuery: Record<string, unknown> = { isDeleted: false };

  // If requested by a Property Manager, limit to their own properties
  if (isManagerOnly && userId) {
    baseQuery.user = userId;
  }

  const propertyQuery = new QueryBuilder(
    PropertyModel.find(baseQuery)
      .populate("user", "firstName lastName email contact profileImage")
      .populate("category", "name")
      .populate("subCategory", "name"),
    query
  )
    .search(searchFields)
    .filter()
    .sort()
    .fields()
    .paginate();

  const properties = await propertyQuery.modelQuery.lean();
  const paginationInfo = await propertyQuery.getPaginationInfo();
  const totalProperties = await PropertyModel.countDocuments(baseQuery);

  return {
    properties,
    meta: paginationInfo,
    totalProperties,
  };
};

// Get single property by ID
const getSingleProperty = async (id: string, userId?: string, isManagerOnly: boolean = false) => {
  const property = await PropertyModel.findOne({ _id: id, isDeleted: false })
    .populate("user", "firstName lastName email contact profileImage")
    .populate("category", "name")
    .populate("subCategory", "name");

  if (!property) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Property not found");
  }

  if (isManagerOnly && userId && property.user._id.toString() !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Access denied. You do not own this property.");
  }

  return property;
};

// Update property
const updateProperty = async (id: string, userId: string, payload: Partial<IProperty>, isAdmin: boolean = false) => {
  const property = await PropertyModel.findOne({ _id: id, isDeleted: false });
  if (!property) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Property not found");
  }

  if (!isAdmin && property.user.toString() !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Access denied. You can only update your own property.");
  }

  if (payload.category) {
    const categoryExists = await CategoryModel.findById(payload.category);
    if (!categoryExists) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Category not found");
    }
  }

  if (payload.subCategory) {
    const subCategoryExists = await CategoryModel.findById(payload.subCategory);
    if (!subCategoryExists) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Sub-category not found");
    }
  }

  const result = await PropertyModel.findByIdAndUpdate(id, payload, { new: true })
    .populate("user", "firstName lastName email contact profileImage")
    .populate("category", "name")
    .populate("subCategory", "name");

  return result;
};

// Delete property (Soft delete)
const deleteProperty = async (id: string, userId: string, isAdmin: boolean = false) => {
  const property = await PropertyModel.findOne({ _id: id, isDeleted: false });
  if (!property) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Property not found");
  }

  if (!isAdmin && property.user.toString() !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Access denied. You can only delete your own property.");
  }

  const result = await PropertyModel.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true }
  );

  return result;
};

export const PropertyServices = {
  createProperty,
  getAllProperties,
  getSingleProperty,
  updateProperty,
  deleteProperty,
};
