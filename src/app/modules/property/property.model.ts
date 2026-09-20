import { model, Schema } from "mongoose";
import { IProperty, PropertyModelType, PROPERTY_STATUS } from "./property.interface";

const propertySchema = new Schema<IProperty, PropertyModelType>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    subCategory: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    unitSuiteNo: {
      type: String,
      default: "",
      trim: true,
    },
    totalUnits: {
      type: Number,
      default: null,
    },
    floorRange: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(PROPERTY_STATUS),
      default: PROPERTY_STATUS.ACTIVE,
    },
    coverPhoto: {
      type: String,
      default: "",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const PropertyModel = model<IProperty, PropertyModelType>("Property", propertySchema);
