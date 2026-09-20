import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { CategoryServices } from "./category.service";
import { ICategory } from "./category.interface";
import { StatusCodes } from "http-status-codes";

// Create category / sub-category
const createCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryServices.createCategory(req.body);
  sendResponse<ICategory>(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Category created successfully",
    data: result,
  });
});

// Get all categories (Top-level with sub-categories)
const getAllCategories = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryServices.getAllCategories(req.query);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Categories retrieved successfully",
    data: result,
  });
});

// Get sub-categories for a parent category
const getSubCategoriesByParent = catchAsync(async (req: Request, res: Response) => {
  const { parentId } = req.params;
  const result = await CategoryServices.getSubCategoriesByParent(parentId);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Sub-categories retrieved successfully",
    data: result,
  });
});

// Get single category
const getSingleCategory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CategoryServices.getSingleCategory(id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Category retrieved successfully",
    data: result,
  });
});

// Update category
const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const payload = req.body;
  const result = await CategoryServices.updateCategory(id, payload);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Category updated successfully",
    data: result,
  });
});

// Delete category
const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const result = await CategoryServices.deleteCategory(id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Category deleted successfully",
    data: result,
  });
});

export const categoryController = {
  createCategory,
  getAllCategories,
  getSubCategoriesByParent,
  getSingleCategory,
  updateCategory,
  deleteCategory,
};
