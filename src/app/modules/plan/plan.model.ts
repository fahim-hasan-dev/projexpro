import { model, Schema } from "mongoose";
import { IPlan, PlanModel } from "./plan.interface";

const planSchema = new Schema<IPlan, PlanModel>(
    {
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        planType: {
            type: String,
            enum: ['prime', 'pro', 'enterprise'],
            default: 'prime',
            required: true
        },
        price: {
            type: Number,
            required: false,
            default: 0
        },
        unitPrice: {
            type: Number,
            required: false,
            default: 0
        },
        minimumPrice: {
            type: Number,
            required: false,
            default: 0
        },
        duration: {
            type: String,
            enum: ['1 month' , '3 months' , '6 months' , '1 year'],
            required: true
        },
        paymentType: {
            type: String,
            enum: ['Monthly' , 'Yearly'],
            required: true
        },
        maxUnits: {
            type: Number,
            default: null
        },
        productId: {
            type: String,
            required: false
        },
        priceId: {
            type: String,
            required: false
        },
        status: {
            type: String,
            enum: ['Active', 'Delete'],
            default: "Active"
        },
        features: {
            type: [String],
            required: true
        }
    },
    {
        timestamps: true
    }
)

export const Plan = model<IPlan, PlanModel>("Plan", planSchema)