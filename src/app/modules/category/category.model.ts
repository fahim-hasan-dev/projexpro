import { model, Schema } from "mongoose";
import { ICategory, CategoryModelType } from "./category.interface";

const categorySchema = new Schema<ICategory, CategoryModelType>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    parent: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate category names under the same parent
categorySchema.index({ name: 1, parent: 1 }, { unique: true });

export const CategoryModel = model<ICategory, CategoryModelType>("Category", categorySchema);
