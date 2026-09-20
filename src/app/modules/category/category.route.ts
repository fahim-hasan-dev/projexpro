import express from "express";
import { CategoryValidations } from "./category.validation";
import validateRequest from "../../middleware/validateRequest";
import { categoryController } from "./category.controller";
import auth from "../../middleware/auth";
import { ADMIN_ROLES } from "../../../enum/user";

const router = express.Router();

router.post(
    "/create",
    auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
    validateRequest(CategoryValidations.createCategoryZod),
    categoryController.createCategory
);

router.get("/", categoryController.getAllCategories);
router.get("/sub-categories/:parentId", categoryController.getSubCategoriesByParent);
router.get("/:id", categoryController.getSingleCategory);

router.patch(
    "/:id",
    auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
    validateRequest(CategoryValidations.updateCategoryZod),
    categoryController.updateCategory
);

router.delete(
    "/:id",
    auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
    categoryController.deleteCategory
);

export const CategoryRoutes = router;
