import { Model, Types } from 'mongoose';

export type ISubscription = {
    _id?:string;
    user: Types.ObjectId;
    customerId: string;
    price: number;
    plan: Types.ObjectId;
    trxId?: string;
    subscriptionId: string;
    status: 'expired' | 'active' | 'cancel';
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    invoice?: string;
    isEnterprise?: boolean;
    enterpriseData?: {
        planName?: string;
        effectiveDate?: Date;
        billingDate?: Date;
        numberOfUnits?: number;
        perUnitFee?: number;
        totalMonthlySubscription?: number;
    };
};



export type SubscriptionModel = Model<ISubscription, Record<string, unknown>>;