import { Model, Types } from "mongoose";

export enum INVOICE_STATUS {
  UNPAID = "Unpaid",
  PAID = "Paid",
  CANCELLED = "Cancelled",
}

export interface IInvoiceItem {
  description: string;
  qty: number;
  unitPrice: number;
  amount: number;
}

export interface IInvoice {
  _id: Types.ObjectId;
  invoiceNo: string;
  serviceRequest: Types.ObjectId;
  property: Types.ObjectId;
  propertyManager: Types.ObjectId;
  serviceProvider?: Types.ObjectId;
  jobId?: string;
  dueDate: Date;
  items: IInvoiceItem[];
  subtotal: number;
  tax: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  status: INVOICE_STATUS;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type InvoiceModelType = Model<IInvoice>;
