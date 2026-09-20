import { StatusCodes } from "http-status-codes";
import { Types } from "mongoose";
import ApiError from "../../../errors/ApiError";
import QueryBuilder from "../../builder/QueryBuilder";
import { IInvoice, INVOICE_STATUS } from "./invoice.interface";
import { InvoiceModel } from "./invoice.model";
import { ServiceRequestModel } from "../serviceRequest/serviceRequest.model";
import { User } from "../user/user.model";
import stripe from "../../../config/stripe";
import config from "../../../config";
import { NotificationService } from "../notification/notification.service";
import { USER_ROLES } from "../../../enum/user";

// Generate or retrieve invoice for a completed Service Request
const createInvoiceFromServiceRequest = async (serviceRequestId: string | Types.ObjectId) => {
  const serviceRequest = await ServiceRequestModel.findOne({ _id: serviceRequestId, isDeleted: false })
    .populate("property")
    .populate("user")
    .populate("assignedProvider");

  if (!serviceRequest) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Service request not found");
  }

  // Check if an invoice already exists for this service request
  const existingInvoice = await InvoiceModel.findOne({ serviceRequest: serviceRequest._id })
    .populate({
      path: "property",
      populate: [
        { path: "category", select: "name" },
        { path: "subCategory", select: "name" },
      ],
    })
    .populate("serviceRequest")
    .populate("propertyManager", "firstName lastName email contact profileImage")
    .populate("serviceProvider", "firstName lastName email contact profileImage");

  if (existingInvoice) {
    return existingInvoice;
  }

  const basePrice = serviceRequest.finalPayout || serviceRequest.basePayment || 0;
  const itemDescription = `${serviceRequest.issueTitle} (${serviceRequest.requestNo})`;

  const items = [
    {
      description: itemDescription,
      qty: 1,
      unitPrice: basePrice,
      amount: basePrice,
    },
  ];

  const subtotal = basePrice;
  const tax = 0;
  const totalAmount = subtotal + tax;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30); // 30 days due date

  const invoiceData = {
    serviceRequest: serviceRequest._id,
    property: serviceRequest.property._id || serviceRequest.property,
    propertyManager: serviceRequest.user._id || serviceRequest.user,
    serviceProvider: serviceRequest.assignedProvider ? (serviceRequest.assignedProvider as any)._id || serviceRequest.assignedProvider : null,
    jobId: serviceRequest.requestNo,
    dueDate,
    items,
    subtotal,
    tax,
    totalAmount,
    paidAmount: 0,
    balanceDue: totalAmount,
    status: INVOICE_STATUS.UNPAID,
  };

  const newInvoice = await InvoiceModel.create(invoiceData);

  const populatedInvoice = await InvoiceModel.findById(newInvoice._id)
    .populate({
      path: "property",
      populate: [
        { path: "category", select: "name" },
        { path: "subCategory", select: "name" },
      ],
    })
    .populate("serviceRequest")
    .populate("propertyManager", "firstName lastName email contact profileImage")
    .populate("serviceProvider", "firstName lastName email contact profileImage");

  // Send notification to Property Manager
  try {
    const managerId = (serviceRequest.user as any)._id ? (serviceRequest.user as any)._id : serviceRequest.user;
    await NotificationService.insertNotification({
      receiver: new Types.ObjectId(managerId),
      title: "Invoice Generated",
      message: `Invoice ${newInvoice.invoiceNo} has been generated for Service Request ${serviceRequest.requestNo}. Balance due: £${totalAmount}.`,
      referenceId: newInvoice._id,
      screen: "INVOICE",
      type: "USER",
    });
  } catch (error) {
    console.error("Failed to send invoice notification:", error);
  }

  return populatedInvoice;
};

// Create Stripe Checkout Session for Invoice Payment (Pay Now)
const createCheckoutSessionForInvoice = async (invoiceId: string, userId: string) => {
  const invoice = await InvoiceModel.findById(invoiceId)
    .populate("propertyManager")
    .populate("serviceRequest");

  if (!invoice) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Invoice not found");
  }

  const manager = invoice.propertyManager as any;
  if (manager._id.toString() !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Access denied. You can only pay invoices for your own properties.");
  }

  if (invoice.status === INVOICE_STATUS.PAID || invoice.balanceDue <= 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "This invoice is already paid.");
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "gbp",
          product_data: {
            name: `Invoice ${invoice.invoiceNo}`,
            description: `Payment for Service Request ${invoice.jobId || (invoice.serviceRequest as any)?.requestNo || ''}`,
          },
          unit_amount: Math.round(invoice.balanceDue * 100),
        },
        quantity: 1,
      },
    ],
    customer_email: manager.email,
    success_url: `${config.stripe.frontendUrl}/invoice/success?session_id={CHECKOUT_SESSION_ID}&invoice_id=${invoice._id}`,
    cancel_url: `${config.stripe.frontendUrl}/invoice/cancel?invoice_id=${invoice._id}`,
    metadata: {
      invoiceId: invoice._id.toString(),
      serviceRequestId: (invoice.serviceRequest as any)._id
        ? (invoice.serviceRequest as any)._id.toString()
        : invoice.serviceRequest.toString(),
      userId: manager._id.toString(),
      invoiceNo: invoice.invoiceNo,
    },
  });

  await InvoiceModel.findByIdAndUpdate(invoiceId, {
    stripeCheckoutSessionId: session.id,
  });

  return { checkoutUrl: session.url, session };
};

// Get Single Invoice Details
const getSingleInvoice = async (id: string, userId: string, role: string) => {
  const invoice = await InvoiceModel.findById(id)
    .populate({
      path: "property",
      populate: [
        { path: "category", select: "name" },
        { path: "subCategory", select: "name" },
      ],
    })
    .populate("serviceRequest")
    .populate("propertyManager", "firstName lastName email contact profileImage")
    .populate("serviceProvider", "firstName lastName email contact profileImage");

  if (!invoice) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Invoice not found");
  }

  if (role === USER_ROLES.PROPERTY_MANAGER && (invoice.propertyManager as any)._id.toString() !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Access denied. You do not own this invoice.");
  }

  return invoice;
};

// Get Invoice by Service Request ID
const getInvoiceByServiceRequest = async (serviceRequestId: string, userId: string, role: string) => {
  let invoice = await InvoiceModel.findOne({ serviceRequest: serviceRequestId })
    .populate({
      path: "property",
      populate: [
        { path: "category", select: "name" },
        { path: "subCategory", select: "name" },
      ],
    })
    .populate("serviceRequest")
    .populate("propertyManager", "firstName lastName email contact profileImage")
    .populate("serviceProvider", "firstName lastName email contact profileImage");

  // If not created yet, check if service request is completed and generate it
  if (!invoice) {
    const serviceRequest = await ServiceRequestModel.findById(serviceRequestId);
    if (serviceRequest) {
      invoice = await createInvoiceFromServiceRequest(serviceRequestId);
    }
  }

  if (!invoice) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Invoice not found for this service request");
  }

  return invoice;
};

// Get My Invoices (Property Manager)
const getMyInvoices = async (userId: string, query: Record<string, unknown>) => {
  const searchFields = ["invoiceNo", "jobId"];
  const invoiceQueryBuilder = new QueryBuilder(
    InvoiceModel.find({ propertyManager: userId })
      .populate({
        path: "property",
        populate: [
          { path: "category", select: "name" },
          { path: "subCategory", select: "name" },
        ],
      })
      .populate("serviceRequest")
      .populate("serviceProvider", "firstName lastName email contact profileImage"),
    query
  )
    .search(searchFields)
    .filter()
    .sort()
    .fields()
    .paginate();

  const invoices = await invoiceQueryBuilder.modelQuery.lean();
  const paginationInfo = await invoiceQueryBuilder.getPaginationInfo();
  const totalInvoices = await InvoiceModel.countDocuments({ propertyManager: userId });

  return {
    invoices,
    meta: paginationInfo,
    totalInvoices,
  };
};

// Get All Invoices (Admin)
const getAllInvoicesForAdmin = async (query: Record<string, unknown>) => {
  const searchFields = ["invoiceNo", "jobId"];
  const invoiceQueryBuilder = new QueryBuilder(
    InvoiceModel.find()
      .populate({
        path: "property",
        populate: [
          { path: "category", select: "name" },
          { path: "subCategory", select: "name" },
        ],
      })
      .populate("serviceRequest")
      .populate("propertyManager", "firstName lastName email contact profileImage")
      .populate("serviceProvider", "firstName lastName email contact profileImage"),
    query
  )
    .search(searchFields)
    .filter()
    .sort()
    .fields()
    .paginate();

  const invoices = await invoiceQueryBuilder.modelQuery.lean();
  const paginationInfo = await invoiceQueryBuilder.getPaginationInfo();
  const totalInvoices = await InvoiceModel.countDocuments();

  return {
    invoices,
    meta: paginationInfo,
    totalInvoices,
  };
};

export const InvoiceServices = {
  createInvoiceFromServiceRequest,
  createCheckoutSessionForInvoice,
  getSingleInvoice,
  getInvoiceByServiceRequest,
  getMyInvoices,
  getAllInvoicesForAdmin,
};
