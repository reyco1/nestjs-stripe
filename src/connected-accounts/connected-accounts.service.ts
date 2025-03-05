import { CreateConnectedAccountDto } from "./dto/create-connected-account.dto";
import { CreateAccountLinkDto } from "./dto/create-account-link.dto";
import { CreateBankAccountDto } from "./dto/create-bank-account.dto";
import { Injectable, Inject, Logger } from "@nestjs/common";
import { STRIPE_CLIENT_TOKEN } from "../stripe.constants";
import Stripe from "stripe";
import { ConnectedAccountCheckoutSessionDto } from "./dto/connected-account-checkout.dto";

@Injectable()
export class ConnectedAccountsService {
    constructor(
        @Inject(STRIPE_CLIENT_TOKEN) private readonly stripeClient: Stripe,
        private readonly logger: Logger = new Logger(ConnectedAccountsService.name)
    ) { }

    async createConnectedAccount(data: CreateConnectedAccountDto): Promise<Stripe.Account> {
        try {
            return await this.stripeClient.accounts.create({
                type: 'express', // or 'standard' or 'custom'
                country: data.country,
                email: data.email,
                capabilities: data.capabilities,
                business_type: data.businessType,
                business_profile: data.businessProfile,
                metadata: data.metadata,
            });
        } catch (error) {
            this.logger.error(`Error creating connected account: ${error.message}`, error.stack);
            throw error;
        }
    }

    async createAccountLink(data: CreateAccountLinkDto): Promise<Stripe.AccountLink> {
        try {
            return await this.stripeClient.accountLinks.create({
                account: data.accountId,
                refresh_url: data.refreshUrl,
                return_url: data.returnUrl,
                type: data.type || 'account_onboarding',
                collect: data.collect,
            });
        } catch (error) {
            this.logger.error(`Error creating account link: ${error.message}`, error.stack);
            throw error;
        }
    }

    async retrieveConnectedAccount(accountId: string): Promise<Stripe.Account> {
        try {
            return await this.stripeClient.accounts.retrieve(accountId);
        } catch (error) {
            this.logger.error(`Error retrieving connected account: ${error.message}`, error.stack);
            throw error;
        }
    }

    async createBankAccount(accountId: string, data: CreateBankAccountDto): Promise<Stripe.BankAccount> {
        try {
            const externalAccount = await this.stripeClient.accounts.createExternalAccount(
                accountId,
                {
                    external_account: {
                        object: 'bank_account',
                        country: data.country,
                        currency: data.currency,
                        account_number: data.accountNumber,
                        routing_number: data.routingNumber,
                        account_holder_name: data.accountHolderName,
                        account_holder_type: data.accountHolderType || 'individual',
                    }
                }
            );
            return externalAccount as Stripe.BankAccount;
        } catch (error) {
            this.logger.error(`Error creating bank account: ${error.message}`, error.stack);
            throw error;
        }
    }

    async createPaymentIntent(
        amount: number,
        currency: string,
        connectedAccountId: string,
        applicationFeeAmount?: number
    ): Promise<Stripe.PaymentIntent> {
        try {
            return await this.stripeClient.paymentIntents.create({
                amount,
                currency,
                application_fee_amount: applicationFeeAmount,
                transfer_data: {
                    destination: connectedAccountId,
                },
            });
        } catch (error) {
            this.logger.error(`Error creating payment for connected account: ${error.message}`, error.stack);
            throw error;
        }
    }

    async createTransfer(
        amount: number,
        currency: string,
        destination: string,
        metadata?: Record<string, string>
    ): Promise<Stripe.Transfer> {
        try {
            return await this.stripeClient.transfers.create({
                amount,
                currency,
                destination,
                metadata
            });
        } catch (error) {
            this.logger.error(`Error creating transfer: ${error.message}`, error.stack);
            throw error;
        }
    }

    // Retrieve all connected accounts with pagination
    async listConnectedAccounts(limit: number = 10, startingAfter?: string): Promise<Stripe.ApiList<Stripe.Account>> {
        try {
            return await this.stripeClient.accounts.list({
                limit,
                starting_after: startingAfter
            });
        } catch (error) {
            this.logger.error(`Error listing connected accounts: ${error.message}`, error.stack);
            throw error;
        }
    }

    // Update a connected account
    async updateConnectedAccount(accountId: string, data: Partial<CreateConnectedAccountDto>): Promise<Stripe.Account> {
        try {
            return await this.stripeClient.accounts.update(accountId, {
                email: data.email,
                business_profile: data.businessProfile,
                metadata: data.metadata,
            });
        } catch (error) {
            this.logger.error(`Error updating connected account: ${error.message}`, error.stack);
            throw error;
        }
    }

    // Create a payout for a connected account
    async createPayout(accountId: string, amount: number, currency: string, metadata?: Record<string, string>): Promise<Stripe.Payout> {
        try {
            return await this.stripeClient.payouts.create(
                {
                    amount,
                    currency,
                    metadata
                },
                {
                    stripeAccount: accountId // This is the key parameter for operating on behalf of a connected account
                }
            );
        } catch (error) {
            this.logger.error(`Error creating payout for connected account: ${error.message}`, error.stack);
            throw error;
        }
    }

    async createConnectedAccountCheckoutSession(
        params: ConnectedAccountCheckoutSessionDto
    ): Promise<Stripe.Checkout.Session> {
        try {
            const sessionConfig: Stripe.Checkout.SessionCreateParams = {
                mode: 'payment',
                success_url: params.successUrl,
                cancel_url: params.cancelUrl,
                line_items: params.lineItems.map(item => ({
                    price: item.price,
                    quantity: item.quantity,
                    adjustable_quantity: item.adjustableQuantity ? {
                        enabled: item.adjustableQuantity.enabled,
                        minimum: item.adjustableQuantity.minimum,
                        maximum: item.adjustableQuantity.maximum,
                    } : undefined,
                    price_data: !item.price ? {
                        currency: item.currency,
                        unit_amount: item.amount,
                        product_data: {
                            name: item.name,
                            description: item.description,
                        },
                    } : undefined,
                })),
                customer_email: params.customerEmail,
                ...(params.customerId ? {
                    customer: params.customerId
                } : {
                    customer_creation: params.customerCreation || 'if_required'
                }),
                client_reference_id: params.clientReferenceId,
                payment_method_types: params.paymentMethodTypes,
                metadata: params.metadata,
                allow_promotion_codes: params.allowPromotionCodes,
                locale: params.locale,
                automatic_tax: params.taxAutoCalculation ? { enabled: true } : undefined,
                shipping_address_collection: params.shippingAddressCollection ? {
                    allowed_countries: params.shippingAddressCollection.allowed_countries,
                } : undefined,
                billing_address_collection: params.billingAddressCollection,
                submit_type: params.submitType,
                phone_number_collection: params.phoneNumberCollection ? { enabled: true } : undefined,
                payment_intent_data: {
                    ...params.paymentIntentData,
                    application_fee_amount: params.applicationFeeAmount,
                    transfer_data: {
                        destination: params.connectedAccountId
                    },
                },
            };

            const session = await this.stripeClient.checkout.sessions.create(sessionConfig);
            this.logger.log(`Created connected account checkout session: ${session.id}`);
            return session;
        } catch (error) {
            this.logger.error(`Error creating connected account checkout session: ${error.message}`, error.stack);
            throw error;
        }
    }
}