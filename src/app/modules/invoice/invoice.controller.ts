import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { InvoiceServices } from "./invoice.service";
import { StatusCodes } from "http-status-codes";
import { JwtPayload } from "jsonwebtoken";

// Generate invoice from completed service request
const createInvoice = catchAsync(async (req: Request, res: Response) => {
  const { serviceRequestId } = req.body;
  const result = await InvoiceServices.createInvoiceFromServiceRequest(serviceRequestId);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Invoice generated successfully",
    data: result,
  });
});

// Pay Invoice via Stripe (Creates Checkout Session)
const payInvoice = catchAsync(async (req: Request, res: Response) => {
  const invoiceId = (req.params.id || req.body.invoiceId) as string;
  const userId = req.user.authId || req.user.id;

  const result = await InvoiceServices.createCheckoutSessionForInvoice(invoiceId, userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Stripe checkout session created for invoice payment",
    data: result,
  });
});

// Pay Invoice directly by Service Request ID
const payInvoiceByServiceRequest = catchAsync(async (req: Request, res: Response) => {
  const serviceRequestId = (req.params.serviceRequestId || req.body.serviceRequestId) as string;
  const userId = req.user.authId || req.user.id;

  const result = await InvoiceServices.createCheckoutSessionForServiceRequest(serviceRequestId, userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Stripe checkout session created for service request invoice payment",
    data: result,
  });
});

// Get Single Invoice Details
const getSingleInvoice = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = req.user.authId || req.user.id;
  const role = req.user.role;

  const result = await InvoiceServices.getSingleInvoice(id, userId, role);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Invoice details retrieved successfully",
    data: result,
  });
});

// Get Invoice by Service Request ID
const getInvoiceByServiceRequest = catchAsync(async (req: Request, res: Response) => {
  const serviceRequestId = req.params.serviceRequestId as string;
  const userId = req.user.authId || req.user.id;
  const role = req.user.role;

  const result = await InvoiceServices.getInvoiceByServiceRequest(serviceRequestId, userId, role);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Invoice retrieved successfully for service request",
    data: result,
  });
});

// Get My Invoices (Property Manager)
const getMyInvoices = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.authId || req.user.id;
  const result = await InvoiceServices.getMyInvoices(userId, req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Invoices retrieved successfully",
    data: result,
  });
});

// Get All Invoices (Admin)
const getAllInvoices = catchAsync(async (req: Request, res: Response) => {
  const result = await InvoiceServices.getAllInvoicesForAdmin(req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "All invoices retrieved successfully",
    data: result,
  });
});

export const InvoiceControllers = {
  createInvoice,
  payInvoice,
  payInvoiceByServiceRequest,
  getSingleInvoice,
  getInvoiceByServiceRequest,
  getMyInvoices,
  getAllInvoices,
};
