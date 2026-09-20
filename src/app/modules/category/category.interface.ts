import { Model, Types } from "mongoose";

export interface ICategory {
  _id: Types.ObjectId;
  name: string;
  parent?: Types.ObjectId | string | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CategoryModelType = Model<ICategory>;
