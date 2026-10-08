import { Model, Types } from 'mongoose';

export type IEnterpriseRequest = {
    _id?: string;
    user: Types.ObjectId;
    plan: Types.ObjectId;
    status: 'pending' | 'approved' | 'rejected';
    
    // Fields filled by admin upon approval
    planName?: string;
    effectiveDate?: Date;
    billingDate?: Date;
    numberOfUnits?: number;
    perUnitFee?: number;
    totalMonthlySubscription?: number;
};

export type EnterpriseRequestModel = Model<IEnterpriseRequest, Record<string, unknown>>;
