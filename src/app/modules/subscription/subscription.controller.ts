import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { SubscriptionService } from "./subscription.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import { JwtPayload } from "jsonwebtoken";

const subscriptions = catchAsync( async(req: Request, res: Response)=>{
    const result = await SubscriptionService.subscriptionsFromDB(req.query);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Subscription List Retrieved Successfully",
        data: result
    })
});

const subscriptionDetails = catchAsync( async(req: Request, res: Response)=>{
    const result = await SubscriptionService.subscriptionDetailsFromDB(req.user as JwtPayload);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Subscription Details Retrieved Successfully",
        data: result
    })
});

const cancelSubscription = catchAsync(async (req: Request, res: Response) => {
    const { cancelImmediately } = req.body;
    const result = await SubscriptionService.cancelSubscription(req.user as JwtPayload, cancelImmediately);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: result.message,
        data: result,
    });
});

const toggleAutoRenew = catchAsync(async (req: Request, res: Response) => {
    const { autoRenew } = req.body;
    const result = await SubscriptionService.toggleAutoRenew(req.user as JwtPayload, autoRenew);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: result.message,
        data: result,
    });
});

const upgradeSubscription = catchAsync(async (req: Request, res: Response) => {
    const { newPlanId } = req.body;
    const result = await SubscriptionService.upgradeSubscription(req.user as JwtPayload, newPlanId);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: result.message,
        data: result,
    });
});

export const SubscriptionController = {
    subscriptions,
    subscriptionDetails,
    cancelSubscription,
    toggleAutoRenew,
    upgradeSubscription,
}
