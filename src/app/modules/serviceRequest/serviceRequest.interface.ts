import { Model, Types } from "mongoose";

export enum REQUEST_PRIORITY {
  URGENT = "Urgent",
  HIGH = "High",
  MEDIUM = "Medium",
  LOW = "Low",
}

export enum REQUEST_STATUS {
  PENDING = "Pending",
  ASSIGNED = "Assigned",
  ACCEPTED = "Accepted",
  REJECTED = "Rejected",
  IN_PROGRESS = "In Progress",
  PENDING_APPROVAL = "Pending Approval",
  COMPLETED = "Completed",
  CANCELLED = "Cancelled",
}

export enum SPECIALIZED_PAYMENT_TYPE {
  PERCENTAGE = "Percentage",
  FLAT_AMOUNT = "Flat Amount",
}

export interface ISpecializedRate {
  isActive?: boolean;
  paymentType?: SPECIALIZED_PAYMENT_TYPE;
  value?: number;
  reason?: string;
}

export interface IServiceRequest {
  _id: Types.ObjectId;
  requestNo: string;
  user: Types.ObjectId;
  property: Types.ObjectId;
  issueTitle: string;
  description: string;
  priority: REQUEST_PRIORITY;
  isOccupied: boolean;
  tenantName?: string;
  tenantPhone?: string;
  locationDetails?: string;
  images?: string[];
  status: REQUEST_STATUS;
  assignedProvider?: Types.ObjectId;
  eta?: Date;
  basePayment?: number;
  specializedRate?: ISpecializedRate;
  finalPayout?: number;
  rejectionReason?: string;
  completionImages?: string[];
  note?: string;
  invoice?: Types.ObjectId;
  isPaid?: boolean;
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ServiceRequestModelType = Model<IServiceRequest>;


