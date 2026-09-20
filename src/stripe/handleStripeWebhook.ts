import { Request, Response } from 'express'
import Stripe from 'stripe'
import { StatusCodes } from 'http-status-codes'
import config from '../config'
import stripe from '../config/stripe'
import ApiError from '../errors/ApiError'
import { handleSubscriptionCreated } from './handleSubscriptionCreated'
import { logger } from '../shared/logger'
import { User } from '../app/modules/user/user.model'
import { Subscription } from '../app/modules/subscription/subscription.model'
import { Payment } from '../app/modules/payment/payment.model'
import { Plan } from '../app/modules/plan/plan.model'

const handleStripeWebhook = async (req: Request, res: Response) => {
    logger.info('Received Stripe Webhook Event');
    const signature = req.headers['stripe-signature'] as string
    const webhookSecret = config.stripe.webhookSecret as string
    let event: Stripe.Event

    try {
        event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret)
    } catch (error) {
        throw new ApiError(
            StatusCodes.BAD_REQUEST,
            `Webhook verification failed: ${error}`,
        )
    }

    const data = event.data.object as any
    const eventType = event.type

    try {
        switch (eventType) {
            case 'checkout.session.completed': {
                const session = data as Stripe.Checkout.Session
                logger.info('✅ Checkout completed:', session.id)

                if (session.mode === 'payment') {
                    // Handle one-time payment
                    await Payment.create({
                        email: session.customer_details?.email,
                        amount: (session.amount_total || 0) / 100,
                        transactionId: (session.payment_intent as string) || session.id,
                        dateTime: new Date(),
                        customerName: session.customer_details?.name,
                        referenceId: session.metadata?.referenceId,
                    });
                }
                break;
            }

            case 'customer.subscription.created': {
                await handleSubscriptionCreated(data as Stripe.Subscription)
                break
            }

            case 'customer.subscription.updated': {
                const sub = data as any;
                logger.info(`🔄 Subscription updated: ${sub.id}`);

                const userId = sub.metadata?.userId;
                let user = userId ? await User.findById(userId) : await User.findOne({ "subscription.subscriptionId": sub.id });
                if (!user && sub.customer) {
                    const customerRes = await stripe.customers.retrieve(sub.customer as string);
                    if ((customerRes as Stripe.Customer).email) {
                        user = await User.findOne({ email: (customerRes as Stripe.Customer).email });
                    }
                }

                if (user) {
                    const productId = sub.items?.data?.[0]?.price?.product as string;
                    const plan = productId ? await Plan.findOne({ productId }) : null;
                    const currentPeriodStart = new Date(sub.current_period_start * 1000);
                    const currentPeriodEnd = new Date(sub.current_period_end * 1000);

                    const isActive = sub.status === 'active' || sub.status === 'trialing';
                    let statusStr = isActive ? (sub.cancel_at_period_end ? 'cancel_at_period_end' : 'active') : 'expired';

                    await User.findByIdAndUpdate(user._id, {
                        subscribe: isActive,
                        subscription: {
                            plan: plan ? plan._id : user.subscription?.plan,
                            subscriptionId: sub.id,
                            status: statusStr,
                            currentPeriodStart,
                            currentPeriodEnd,
                        },
                    });

                    await Subscription.findOneAndUpdate(
                        { subscriptionId: sub.id },
                        {
                            status: isActive ? (sub.cancel_at_period_end ? 'cancel' : 'active') : 'expired',
                            currentPeriodStart,
                            currentPeriodEnd,
                            ...(plan ? { plan: plan._id, price: plan.price } : {}),
                        }
                    );
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const deletedSub = data as any;
                logger.info(`❌ Subscription deleted: ${deletedSub.id}`);

                const userId = deletedSub.metadata?.userId;
                let user = userId ? await User.findById(userId) : await User.findOne({ "subscription.subscriptionId": deletedSub.id });

                if (user) {
                    await User.findByIdAndUpdate(user._id, {
                        subscribe: false,
                        "subscription.status": "cancel",
                    });

                    await Subscription.findOneAndUpdate(
                        { subscriptionId: deletedSub.id },
                        { status: "cancel" }
                    );
                }
                break;
            }

            case 'invoice.payment_succeeded': {
                const invoice = data as any;
                logger.info(`💳 Invoice payment succeeded for invoice: ${invoice.id}`);

                if (invoice.subscription) {
                    const subId = invoice.subscription as string;
                    const stripeSub = (await stripe.subscriptions.retrieve(subId)) as any;
                    const currentPeriodStart = new Date(stripeSub.current_period_start * 1000);
                    const currentPeriodEnd = new Date(stripeSub.current_period_end * 1000);

                    const user = await User.findOne({ "subscription.subscriptionId": subId });
                    if (user) {
                        await User.findByIdAndUpdate(user._id, {
                            subscribe: true,
                            "subscription.status": stripeSub.cancel_at_period_end ? "cancel_at_period_end" : "active",
                            "subscription.currentPeriodStart": currentPeriodStart,
                            "subscription.currentPeriodEnd": currentPeriodEnd,
                        });

                        await Subscription.findOneAndUpdate(
                            { subscriptionId: subId },
                            {
                                status: stripeSub.cancel_at_period_end ? "cancel" : "active",
                                currentPeriodStart,
                                currentPeriodEnd,
                            }
                        );
                    }
                }
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = data as any;
                logger.warn(`⚠️ Invoice payment failed for subscription: ${invoice.subscription}`);
                if (invoice.subscription) {
                    const subId = invoice.subscription as string;
                    await Subscription.findOneAndUpdate(
                        { subscriptionId: subId },
                        { status: "expired" }
                    );
                }
                break;
            }

            default:
                logger.info(`⚠️ Unhandled event type: ${eventType}`)
        }
    } catch (error) {
        logger.error('Webhook error:', error)
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, `${error}`)
    }

    res.sendStatus(200)
}

export default handleStripeWebhook
