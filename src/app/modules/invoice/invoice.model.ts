import { model, Schema } from "mongoose";
import { IInvoice, InvoiceModelType, INVOICE_STATUS } from "./invoice.interface";

const invoiceItemSchema = new Schema(
  {
    description: { type: String, required: true, trim: true },
    qty: { type: Number, required: true, default: 1 },
    unitPrice: { type: Number, required: true, default: 0 },
    amount: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const invoiceSchema = new Schema<IInvoice, InvoiceModelType>(
  {
    invoiceNo: {
      type: String,
      required: true,
      unique: true,
    },
    serviceRequest: {
      type: Schema.Types.ObjectId,
      ref: "ServiceRequest",
      required: true,
    },
    property: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    propertyManager: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    serviceProvider: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    jobId: {
      type: String,
      default: "",
    },
    dueDate: {
      type: Date,
      required: true,
    },
    items: {
      type: [invoiceItemSchema],
      default: [],
    },
    subtotal: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    balanceDue: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: Object.values(INVOICE_STATUS),
      default: INVOICE_STATUS.UNPAID,
    },
    stripeCheckoutSessionId: {
      type: String,
      default: "",
    },
    stripePaymentIntentId: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

invoiceSchema.pre("validate", async function (next) {
  if (!this.invoiceNo) {
    const count = await model("Invoice").countDocuments();
    const nextNum = 8820 + count;
    this.invoiceNo = `RF-${nextNum}`;
  }
  next();
});

export const InvoiceModel = model<IInvoice, InvoiceModelType>("Invoice", invoiceSchema);
