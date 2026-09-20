import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import QueryBuilder from "../../builder/QueryBuilder";
import { ICategory } from "./category.interface";
import { CategoryModel } from "./category.model";

// Create category or sub-category
const createCategory = async (payload: ICategory) => {
  if (payload.parent) {
    const parentCategory = await CategoryModel.findById(payload.parent);
    if (!parentCategory) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Parent category not found");
    }
  }

  const result = await CategoryModel.create(payload);
  return result;
};

// Get all categories
const getAllCategories = async (query: Record<string, unknown>) => {
  let filterQuery: Record<string, unknown> = { isActive: true };

  // If query specifies parent, filter by parent ID; if parent="null", fetch top-level parent categories
  if (query.parent !== undefined) {
    if (query.parent === "null" || query.parent === null || query.parent === "") {
      filterQuery.parent = null;
    } else if (query.parent === "all") {
      // fetch all categories without parent restriction
    } else {
      filterQuery.parent = query.parent;
    }
    delete query.parent;
  }

  const categoryQueryBuilder = new QueryBuilder(
    CategoryModel.find(filterQuery).populate("parent"),
    query
  )
    .filter()
    .sort()
    .fields()
    .paginate();

  const categories = await categoryQueryBuilder.modelQuery.lean();
  const paginationInfo = await categoryQueryBuilder.getPaginationInfo();
  const totalCategories = await CategoryModel.countDocuments(filterQuery);

  return {
    categories,
    meta: paginationInfo,
    totalCategories,
  };
};

// Get sub-categories for a specific parent category
const getSubCategoriesByParent = async (parentId: string) => {
  const parentCategory = await CategoryModel.findById(parentId);
  if (!parentCategory) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Parent category not found");
  }

  const subCategories = await CategoryModel.find({
    parent: parentId,
    isActive: true,
  }).lean();

  return {
    parentCategory,
    subCategories,
  };
};

// Get single category details with parent populated
const getSingleCategory = async (id: string) => {
  const result = await CategoryModel.findById(id).populate("parent");

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Category not found");
  }

  return result;
};

// Update category or sub-category
const updateCategory = async (id: string, payload: Partial<ICategory>) => {
  const isExist = await CategoryModel.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Category not found");
  }

  if (payload.parent) {
    const parentCategory = await CategoryModel.findById(payload.parent);
    if (!parentCategory) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Parent category not found");
    }
  }

  const result = await CategoryModel.findByIdAndUpdate(id, payload, {
    new: true,
  });
  return result;
};

// Delete category and its sub-categories
const deleteCategory = async (id: string) => {
  const isExist = await CategoryModel.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Category not found");
  }

  // Delete all child sub-categories if deleting a parent category
  await CategoryModel.deleteMany({ parent: id });

  const result = await CategoryModel.findByIdAndDelete(id);
  return result;
};

export const CategoryServices = {
  createCategory,
  getAllCategories,
  getSubCategoriesByParent,
  getSingleCategory,
  updateCategory,
  deleteCategory,
};
