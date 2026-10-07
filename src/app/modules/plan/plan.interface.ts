import { Model } from "mongoose";

export type IPlan = {
    title: string;
    description: string;
    planType: 'prime' | 'pro' | 'enterprise';
    price?: number;
    unitPrice?: number;
    minimumPrice?: number;
    duration: '1 month' | '3 months' | '6 months' | '1 year'; 
    paymentType: 'Monthly' | 'Yearly';
    maxUnits?: number;
    productId?: string;
    status: 'Active' | 'Delete';
    priceId?: string;
    features: string[];
}

export type PlanModel = Model<IPlan, Record<string, unknown>>;