import { Model, Types } from "mongoose";

export enum PROPERTY_STATUS {
  ACTIVE = "Active",
  INACTIVE = "Inactive",
}

export interface IProperty {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  category: Types.ObjectId;
  subCategory: Types.ObjectId;
  name: string;
  address: string;
  unitSuiteNo?: string;
  totalUnits?: number;
  floorRange?: string;
  status: PROPERTY_STATUS;
  coverPhoto?: string;
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type PropertyModelType = Model<IProperty>;
