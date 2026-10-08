import { model, Schema } from "mongoose";
import { IEnterpriseRequest, EnterpriseRequestModel } from "./enterpriseRequest.interface";

const enterpriseRequestSchema = new Schema<IEnterpriseRequest, EnterpriseRequestModel>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        plan: {
            type: Schema.Types.ObjectId,
            ref: "Plan",
            required: true
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
            required: true
        },
        planName: {
            type: String,
            required: false
        },
        effectiveDate: {
            type: Date,
            required: false
        },
        billingDate: {
            type: Date,
            required: false
        },
        numberOfUnits: {
            type: Number,
            required: false
        },
        perUnitFee: {
            type: Number,
            required: false
        },
        totalMonthlySubscription: {
            type: Number,
            required: false
        }
    },
    {
        timestamps: true
    }
);

export const EnterpriseRequest = model<IEnterpriseRequest, EnterpriseRequestModel>("EnterpriseRequest", enterpriseRequestSchema);
