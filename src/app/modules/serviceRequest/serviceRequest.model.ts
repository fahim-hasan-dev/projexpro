import { model, Schema } from "mongoose";
import {
  IServiceRequest,
  ServiceRequestModelType,
  REQUEST_PRIORITY,
  REQUEST_STATUS,
  SPECIALIZED_PAYMENT_TYPE,
} from "./serviceRequest.interface";

const specializedRateSchema = new Schema(
  {
    isActive: {
      type: Boolean,
      default: false,
    },
    paymentType: {
      type: String,
      enum: Object.values(SPECIALIZED_PAYMENT_TYPE),
      default: SPECIALIZED_PAYMENT_TYPE.PERCENTAGE,
    },
    value: {
      type: Number,
      default: 0,
    },
    reason: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const serviceRequestSchema = new Schema<IServiceRequest, ServiceRequestModelType>(
  {
    requestNo: {
      type: String,
      required: true,
      unique: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    property: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    issueTitle: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: Object.values(REQUEST_PRIORITY),
      default: REQUEST_PRIORITY.MEDIUM,
    },
    isOccupied: {
      type: Boolean,
      required: true,
      default: false,
    },
    tenantName: {
      type: String,
      default: "",
      trim: true,
    },
    tenantPhone: {
      type: String,
      default: "",
      trim: true,
    },
    locationDetails: {
      type: String,
      default: "",
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: Object.values(REQUEST_STATUS),
      default: REQUEST_STATUS.PENDING,
    },
    assignedProvider: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    eta: {
      type: Date,
      default: null,
    },
    basePayment: {
      type: Number,
      default: 0,
    },
    specializedRate: {
      type: specializedRateSchema,
      default: () => ({ isActive: false, paymentType: SPECIALIZED_PAYMENT_TYPE.PERCENTAGE, value: 0, reason: "" }),
    },
    finalPayout: {
      type: Number,
      default: 0,
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

serviceRequestSchema.pre("validate", async function (next) {
  if (!this.requestNo) {
    const count = await model("ServiceRequest").countDocuments();
    const nextNum = 1000 + count + 1;
    this.requestNo = `SR-${nextNum}`;
  }
  next();
});

export const ServiceRequestModel = model<IServiceRequest, ServiceRequestModelType>(
  "ServiceRequest",
  serviceRequestSchema
);
