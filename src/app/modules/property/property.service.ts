import { StatusCodes } from "http-status-codes";
import { Types } from "mongoose";
import ApiError from "../../../errors/ApiError";
import QueryBuilder from "../../builder/QueryBuilder";
import { IProperty } from "./property.interface";
import { PropertyModel } from "./property.model";
import { CategoryModel } from "../category/category.model";
import { User } from "../user/user.model";
import { IPlan } from "../plan/plan.interface";

// Helper to calculate total active units for a property manager
const getManagerTotalUnits = async (userId: string): Promise<number> => {
  const result = await PropertyModel.aggregate([
    { $match: { user: new Types.ObjectId(userId), isDeleted: false } },
    {
      $group: {
        _id: null,
        total: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $eq: ["$totalUnits", null] },
                  { $eq: ["$totalUnits", undefined] },
                  { $lte: ["$totalUnits", 0] },
                ],
              },
              1,
              "$totalUnits",
            ],
          },
        },
      },
    },
  ]);
  return result[0]?.total || 0;
};

// Helper to update totalUnitsUsed on user document
const syncUserTotalUnits = async (userId: string): Promise<number> => {
  const totalUnits = await getManagerTotalUnits(userId);
  await User.findByIdAndUpdate(userId, { totalUnitsUsed: totalUnits });
  return totalUnits;
};

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

  // Fetch user and check subscription maxUnits limit
  const user = await User.findById(userId).populate<{ subscription: { plan: IPlan } }>("subscription.plan");
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  const newPropertyUnits = payload.totalUnits && payload.totalUnits > 0 ? payload.totalUnits : 1;
  const currentTotalUnits = await getManagerTotalUnits(userId);
  const projectedTotalUnits = currentTotalUnits + newPropertyUnits;

  if (user.subscription && user.subscription.plan && typeof user.subscription.plan === 'object') {
    const planMaxUnits = user.subscription.plan.maxUnits;
    if (planMaxUnits !== undefined && planMaxUnits > 0) {
      if (projectedTotalUnits > planMaxUnits) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          `Adding this property (${newPropertyUnits} unit${newPropertyUnits > 1 ? 's' : ''}) exceeds your subscription plan limit of ${planMaxUnits} units. Current units used: ${currentTotalUnits}, total after addition would be: ${projectedTotalUnits}.`
        );
      }
    }
  }

  payload.user = userId as any;

  const result = await PropertyModel.create(payload);

  // Sync user's totalUnitsUsed field
  await syncUserTotalUnits(userId);

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
      .populate("user", "firstName lastName userName email phone contactNumber image role totalUnitsUsed")
      .populate("category", "name image")
      .populate("subCategory", "name image"),
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
    .populate("user", "firstName lastName userName email phone contactNumber image role totalUnitsUsed")
    .populate("category", "name image")
    .populate("subCategory", "name image");

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

  // Validate unit limit if totalUnits is being updated
  const propertyOwnerId = property.user.toString();
  if (payload.totalUnits !== undefined && payload.totalUnits !== property.totalUnits) {
    const oldUnits = property.totalUnits && property.totalUnits > 0 ? property.totalUnits : 1;
    const newUnits = payload.totalUnits && payload.totalUnits > 0 ? payload.totalUnits : 1;
    const unitDifference = newUnits - oldUnits;

    if (unitDifference > 0) {
      const user = await User.findById(propertyOwnerId).populate<{ subscription: { plan: IPlan } }>("subscription.plan");
      if (user && user.subscription && user.subscription.plan && typeof user.subscription.plan === 'object') {
        const planMaxUnits = user.subscription.plan.maxUnits;
        if (planMaxUnits !== undefined && planMaxUnits > 0) {
          const currentTotalUnits = await getManagerTotalUnits(propertyOwnerId);
          const projectedTotalUnits = currentTotalUnits + unitDifference;
          if (projectedTotalUnits > planMaxUnits) {
            throw new ApiError(
              StatusCodes.BAD_REQUEST,
              `Updating property total units to ${newUnits} exceeds your subscription plan limit of ${planMaxUnits} units. Current units used: ${currentTotalUnits}, total after update would be: ${projectedTotalUnits}.`
            );
          }
        }
      }
    }
  }

  const result = await PropertyModel.findByIdAndUpdate(id, payload, { new: true })
    .populate("user", "firstName lastName userName email phone contactNumber image role totalUnitsUsed")
    .populate("category", "name image")
    .populate("subCategory", "name image");

  // Sync owner's totalUnitsUsed
  await syncUserTotalUnits(propertyOwnerId);

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

  const propertyOwnerId = property.user.toString();

  const result = await PropertyModel.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true }
  );

  // Sync owner's totalUnitsUsed after deletion
  await syncUserTotalUnits(propertyOwnerId);

  return result;
};

export const PropertyServices = {
  createProperty,
  getAllProperties,
  getSingleProperty,
  updateProperty,
  deleteProperty,
};
