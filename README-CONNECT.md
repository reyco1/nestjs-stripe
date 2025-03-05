# Stripe Connect Integration Guide

This guide provides step-by-step instructions for implementing Stripe Connect with the `@reyco1/nestjs-stripe` package. We'll walk through the process of creating connected accounts, collecting bank details, and transferring funds to your connected users.

## Prerequisites

Before getting started, make sure you have:

1. A Stripe account with Connect enabled
2. The `@reyco1/nestjs-stripe` package installed in your NestJS application
3. Proper configuration in your `app.module.ts` as shown below:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StripeModule, ConnectedAccountsModule } from '@reyco1/nestjs-stripe';

@Module({
  imports: [
    ConfigModule.forRoot(),
    StripeModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        apiKey: configService.get('STRIPE_API_KEY'),
        apiVersion: configService.get('STRIPE_API_VERSION'),
        webhookSecret: configService.get('STRIPE_WEBHOOK_SECRET'),
      }),
    }),
    ConnectedAccountsModule,
    // ... other modules
  ],
})
export class AppModule {}
```

Make sure your `.env` file includes:
```
STRIPE_API_KEY=your_stripe_secret_key
STRIPE_API_VERSION=2025-01-27.acacia
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```

## Step 1: Creating Connected Accounts

### 1.1: Set up the Service and Controller

First, create a service to handle connected account operations:

```typescript
// connected-accounts.service.ts
import { Injectable } from '@nestjs/common';
import { ConnectedAccountsService } from '@reyco1/nestjs-stripe';

@Injectable()
export class MerchantService {
  constructor(private readonly connectedAccountsService: ConnectedAccountsService) {}

  async createMerchantAccount(merchantData: {
    email: string;
    country: string;
    businessType?: 'individual' | 'company';
    businessProfile?: {
      url?: string;
      mcc?: string;
      name?: string;
    };
    metadata?: Record<string, string>;
  }) {
    // Create the connected account
    const account = await this.connectedAccountsService.createConnectedAccount({
      email: merchantData.email,
      country: merchantData.country,
      businessType: merchantData.businessType || 'individual',
      businessProfile: merchantData.businessProfile,
      metadata: merchantData.metadata,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    // Generate an account link for onboarding
    const accountLink = await this.connectedAccountsService.createAccountLink({
      accountId: account.id,
      refreshUrl: `${process.env.APP_URL}/merchants/onboarding/refresh`,
      returnUrl: `${process.env.APP_URL}/merchants/onboarding/complete`,
      type: 'account_onboarding',
    });

    return {
      accountId: account.id,
      onboardingUrl: accountLink.url,
    };
  }

  async retrieveMerchantAccount(accountId: string) {
    return this.connectedAccountsService.retrieveConnectedAccount(accountId);
  }
}
```

Next, create a controller:

```typescript
// merchants.controller.ts
import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { MerchantService } from './merchant.service';

@Controller('merchants')
export class MerchantsController {
  constructor(private readonly merchantService: MerchantService) {}

  @Post()
  async createMerchant(
    @Body()
    merchantData: {
      email: string;
      country: string;
      businessType?: 'individual' | 'company';
      businessProfile?: {
        url?: string;
        mcc?: string;
        name?: string;
      };
      metadata?: Record<string, string>;
    },
  ) {
    return this.merchantService.createMerchantAccount(merchantData);
  }

  @Get(':id')
  async getMerchant(@Param('id') id: string) {
    return this.merchantService.retrieveMerchantAccount(id);
  }
}
```

### 1.2: Implement the Onboarding Flow in Your Frontend

Create an onboarding form in your frontend application:

```typescript
// Frontend example (React)
import React, { useState } from 'react';
import axios from 'axios';

const MerchantOnboarding = () => {
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('US');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post('/api/merchants', {
        email,
        country,
        businessType: 'individual',
      });
      
      // Redirect to Stripe's hosted onboarding
      window.location.href = response.data.onboardingUrl;
    } catch (error) {
      console.error('Error creating merchant account:', error);
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Become a Merchant</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Country:</label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            required
          >
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="GB">United Kingdom</option>
            {/* Add more countries as needed */}
          </select>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Processing...' : 'Continue to Onboarding'}
        </button>
      </form>
    </div>
  );
};

export default MerchantOnboarding;
```

### 1.3: Handle Onboarding Completion

Add endpoint handlers for the return and refresh URLs:

```typescript
// merchants.controller.ts (additional methods)
@Controller('merchants')
export class MerchantsController {
  // ... existing code

  @Get('onboarding/complete')
  async handleOnboardingComplete(@Query('account_id') accountId: string) {
    // Update your database to mark the merchant as onboarded
    // Check account details and capabilities
    const account = await this.merchantService.retrieveMerchantAccount(accountId);
    
    // Redirect to a success page
    return { success: true, accountId, status: account.capabilities };
  }

  @Get('onboarding/refresh')
  async handleOnboardingRefresh(@Query('account_id') accountId: string) {
    // Generate a new account link
    const accountLink = await this.merchantService.createAccountLink({
      accountId: accountId,
      refreshUrl: `${process.env.APP_URL}/merchants/onboarding/refresh`,
      returnUrl: `${process.env.APP_URL}/merchants/onboarding/complete`,
      type: 'account_onboarding',
    });
    
    // Redirect to the new onboarding URL
    return { onboardingUrl: accountLink.url };
  }
}
```

### 1.4: Monitor Account Status with Webhooks

Set up webhook handlers to monitor the connected account status:

```typescript
// merchant-webhooks.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { StripeWebhookHandler } from '@reyco1/nestjs-stripe';
import Stripe from 'stripe';

@Injectable()
export class MerchantWebhooksService {
  private readonly logger = new Logger(MerchantWebhooksService.name);

  @StripeWebhookHandler('account.updated')
  async handleAccountUpdate(event: Stripe.Event) {
    const account = event.data.object as Stripe.Account;
    this.logger.log(`Connected account updated: ${account.id}`);

    // Check if account is now fully onboarded
    if (account.charges_enabled && account.payouts_enabled) {
      this.logger.log(`Account ${account.id} is now fully enabled for charges and payouts`);
      // TODO: Update your database to mark the account as active
    }

    // Check for requirements
    if (account.requirements?.currently_due?.length > 0) {
      this.logger.log(`Account ${account.id} has pending requirements: ${account.requirements.currently_due.join(', ')}`);
      // TODO: Notify the merchant that they need to complete requirements
    }
  }
}
```

## Step 2: Bank Account Collection through Stripe's Onboarding Flow

Bank account details are automatically collected during Stripe's Express onboarding flow. This is the recommended approach for several important reasons:

1. **Security**: Keeping sensitive financial information off your servers reduces your compliance burden
2. **Compliance**: Stripe's forms meet regulatory requirements across different regions
3. **Simplicity**: Stripe handles verification, validation, and edge cases automatically

### 2.1: Leveraging Stripe's Hosted Onboarding

The account onboarding link you created in Step 1 already handles bank account collection. Stripe will prompt users to provide their bank account details as part of the onboarding process.

```typescript
// This method from Step 1 initiates the process that collects bank details
async createMerchantAccount(merchantData) {
  // Create the connected account...

  // Generate an account link for onboarding, which includes bank account collection
  const accountLink = await this.connectedAccountsService.createAccountLink({
    accountId: account.id,
    refreshUrl: `${process.env.APP_URL}/merchants/onboarding/refresh`,
    returnUrl: `${process.env.APP_URL}/merchants/onboarding/complete`,
    type: 'account_onboarding',
  });
  
  return {
    accountId: account.id,
    onboardingUrl: accountLink.url,
  };
}
```

### 2.2: Allowing Users to Update Bank Account Information

If a user needs to update their bank account information later, create an account update link:

```typescript
// merchant.service.ts
async createAccountLink(accountId: string, isUpdate = false) {
  return this.connectedAccountsService.createAccountLink({
    accountId: accountId,
    refreshUrl: `${process.env.APP_URL}/merchants/onboarding/refresh`,
    returnUrl: `${process.env.APP_URL}/merchants/onboarding/complete`,
    type: isUpdate ? 'account_update' : 'account_onboarding',
    collect: 'eventually_due', // This will collect all required information including bank details
  });
}
```

Frontend component to trigger account update for bank details:

```typescript
// Frontend example (React)
import React, { useState } from 'react';
import axios from 'axios';

const UpdateBankDetails = ({ accountId }) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    
    try {
      const response = await axios.post('/api/merchants/link', {
        accountId,
        refreshUrl: `${window.location.origin}/merchants/onboarding/refresh`,
        returnUrl: `${window.location.origin}/merchants/onboarding/complete`,
        type: 'account_update',
        collect: 'eventually_due',
      });
      
      // Redirect to Stripe's hosted update page
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Error creating update link:', error);
      setLoading(false);
    }
  };

  return (
    <button onClick={handleClick} disabled={loading}>
      {loading ? 'Loading...' : 'Update Bank Details via Stripe'}
    </button>
  );
};

export default UpdateBankDetails;
```

## Step 3: Transferring Funds to Connected Accounts

### 3.1: Direct Transfer Method

Add methods for transferring funds directly to connected accounts:

```typescript
// merchant.service.ts (additional methods)
async transferFunds(
  destinationAccountId: string,
  amount: number,
  currency: string = 'usd',
  description?: string
) {
  return this.connectedAccountsService.createTransfer(
    amount, // Amount in cents (e.g., 1000 for $10.00)
    currency,
    destinationAccountId,
    { description, transferType: 'direct' }
  );
}

// Check transfer status
async getTransfer(transferId: string) {
  return this.stripeClient.transfers.retrieve(transferId);
}
```

Add corresponding controller endpoints:

```typescript
// merchants.controller.ts (additional methods)
@Post(':id/transfers')
async transferFunds(
  @Param('id') accountId: string,
  @Body() transferData: {
    amount: number;
    currency?: string;
    description?: string;
  },
) {
  return this.merchantService.transferFunds(
    accountId,
    transferData.amount,
    transferData.currency || 'usd',
    transferData.description
  );
}

@Get('transfers/:id')
async getTransfer(@Param('id') transferId: string) {
  return this.merchantService.getTransfer(transferId);
}
```

### 3.2: Creating Payouts

Add methods for creating payouts for connected accounts:

```typescript
// merchant.service.ts (additional method)
async createPayout(
  accountId: string,
  amount: number,
  currency: string = 'usd',
  metadata?: Record<string, string>
) {
  return this.connectedAccountsService.createPayout(
    accountId,
    amount,
    currency,
    metadata
  );
}
```

Add the corresponding controller endpoint:

```typescript
// merchants.controller.ts (additional method)
@Post(':id/payouts')
async createPayout(
  @Param('id') accountId: string,
  @Body() payoutData: {
    amount: number;
    currency?: string;
    metadata?: Record<string, string>;
  },
) {
  return this.merchantService.createPayout(
    accountId,
    payoutData.amount,
    payoutData.currency || 'usd',
    payoutData.metadata
  );
}
```

### 3.3: Payment Intents with Automatic Transfers

For collecting payments from customers and automatically transferring a portion to connected accounts:

```typescript
// merchant.service.ts (additional method)
async createPaymentWithTransfer(
  connectedAccountId: string,
  amount: number,
  currency: string = 'usd',
  applicationFeeAmount?: number
) {
  return this.connectedAccountsService.createPaymentIntent(
    amount,
    currency,
    connectedAccountId,
    applicationFeeAmount
  );
}
```

Add the corresponding controller endpoint:

```typescript
// merchants.controller.ts (additional method)
@Post(':id/payments')
async createPayment(
  @Param('id') accountId: string,
  @Body() paymentData: {
    amount: number;
    currency?: string;
    applicationFeeAmount?: number;
  },
) {
  return this.merchantService.createPaymentWithTransfer(
    accountId,
    paymentData.amount,
    paymentData.currency || 'usd',
    paymentData.applicationFeeAmount
  );
}
```

### 3.4: Create a Checkout Session for Connected Accounts

For a complete checkout flow that automatically transfers funds:

```typescript
// merchant.service.ts (additional method)
async createConnectedCheckout(
  connectedAccountId: string,
  checkoutData: {
    successUrl: string;
    cancelUrl: string;
    lineItems: Array<{
      name: string;
      amount: number;
      currency: string;
      quantity: number;
    }>;
    applicationFeeAmount: number;
    metadata?: Record<string, string>;
  }
) {
  return this.connectedAccountsService.createConnectedAccountCheckoutSession({
    connectedAccountId: connectedAccountId,
    applicationFeeAmount: checkoutData.applicationFeeAmount,
    successUrl: checkoutData.successUrl,
    cancelUrl: checkoutData.cancelUrl,
    lineItems: checkoutData.lineItems,
    metadata: checkoutData.metadata,
  });
}
```

Add the corresponding controller endpoint:

```typescript
// merchants.controller.ts (additional method)
@Post(':id/checkout-sessions')
async createCheckoutSession(
  @Param('id') accountId: string,
  @Body() checkoutData: {
    successUrl: string;
    cancelUrl: string;
    lineItems: Array<{
      name: string;
      amount: number;
      currency: string;
      quantity: number;
    }>;
    applicationFeeAmount: number;
    metadata?: Record<string, string>;
  },
) {
  return this.merchantService.createConnectedCheckout(accountId, checkoutData);
}
```

### 3.5: Monitoring Transfers with Webhooks

Set up webhook handlers to monitor the status of transfers and payouts:

```typescript
// merchant-webhooks.service.ts (additional handlers)
@Injectable()
export class MerchantWebhooksService {
  // ... existing code

  @StripeWebhookHandler('transfer.created')
  async handleTransferCreated(event: Stripe.Event) {
    const transfer = event.data.object as Stripe.Transfer;
    this.logger.log(`Transfer created: ${transfer.id} for ${transfer.destination}`);
    // TODO: Update your database to record the transfer
  }

  @StripeWebhookHandler('transfer.failed')
  async handleTransferFailed(event: Stripe.Event) {
    const transfer = event.data.object as Stripe.Transfer;
    this.logger.log(`Transfer failed: ${transfer.id} for ${transfer.destination}`);
    // TODO: Handle the failure (notify admin, retry, etc.)
  }

  @StripeWebhookHandler('payout.created')
  async handlePayoutCreated(event: Stripe.Event) {
    const payout = event.data.object as Stripe.Payout;
    this.logger.log(`Payout created: ${payout.id}`);
    // TODO: Update your database to record the payout
  }

  @StripeWebhookHandler('payout.failed')
  async handlePayoutFailed(event: Stripe.Event) {
    const payout = event.data.object as Stripe.Payout;
    this.logger.log(`Payout failed: ${payout.id}, reason: ${payout.failure_message}`);
    // TODO: Handle the failure (notify merchant, retry, etc.)
  }
}
```

## Full Integration Example

Here's an example service that combines all the functionality:

```typescript
// merchant.service.ts (complete example)
import { Injectable, Logger } from '@nestjs/common';
import { ConnectedAccountsService } from '@reyco1/nestjs-stripe';
import Stripe from 'stripe';

@Injectable()
export class MerchantService {
  private readonly logger = new Logger(MerchantService.name);

  constructor(
    private readonly connectedAccountsService: ConnectedAccountsService,
    @Inject(STRIPE_CLIENT_TOKEN) private readonly stripeClient: Stripe,
  ) {}

  // Step 1: Create a connected account
  async createMerchantAccount(merchantData: {
    email: string;
    country: string;
    businessType?: 'individual' | 'company';
    businessProfile?: {
      url?: string;
      mcc?: string;
      name?: string;
    };
    metadata?: Record<string, string>;
  }) {
    try {
      // Create the connected account
      const account = await this.connectedAccountsService.createConnectedAccount({
        email: merchantData.email,
        country: merchantData.country,
        businessType: merchantData.businessType || 'individual',
        businessProfile: merchantData.businessProfile,
        metadata: merchantData.metadata,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      // Generate an account link for onboarding
      const accountLink = await this.connectedAccountsService.createAccountLink({
        accountId: account.id,
        refreshUrl: `${process.env.APP_URL}/merchants/onboarding/refresh`,
        returnUrl: `${process.env.APP_URL}/merchants/onboarding/complete`,
        type: 'account_onboarding',
      });

      this.logger.log(`Created connected account: ${account.id} for ${merchantData.email}`);
      
      return {
        accountId: account.id,
        onboardingUrl: accountLink.url,
      };
    } catch (error) {
      this.logger.error(`Error creating merchant account: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Create a link for continued onboarding or updates
  async createAccountLink(accountId: string, isUpdate = false) {
    try {
      return this.connectedAccountsService.createAccountLink({
        accountId: accountId,
        refreshUrl: `${process.env.APP_URL}/merchants/onboarding/refresh`,
        returnUrl: `${process.env.APP_URL}/merchants/onboarding/complete`,
        type: isUpdate ? 'account_update' : 'account_onboarding',
        collect: 'eventually_due',
      });
    } catch (error) {
      this.logger.error(`Error creating account link: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Get account details
  async retrieveMerchantAccount(accountId: string) {
    try {
      return this.connectedAccountsService.retrieveConnectedAccount(accountId);
    } catch (error) {
      this.logger.error(`Error retrieving account: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Step 2: Add a bank account
  async createAccountUpdateLink(accountId: string) {
    try {
      const accountLink = await this.connectedAccountsService.createAccountLink({
        accountId: accountId,
        refreshUrl: `${process.env.APP_URL}/merchants/onboarding/refresh`,
        returnUrl: `${process.env.APP_URL}/merchants/onboarding/complete`,
        type: 'account_update',
        collect: 'eventually_due',
      });

      this.logger.log(`Created account update link for connected account: ${accountId}`);
      return accountLink;
    } catch (error) {
      this.logger.error(`Error creating account update link: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Step 3: Transfer funds
  async transferFunds(
    destinationAccountId: string,
    amount: number,
    currency: string = 'usd',
    description?: string
  ) {
    try {
      const transfer = await this.connectedAccountsService.createTransfer(
        amount,
        currency,
        destinationAccountId,
        { description, transferType: 'direct' }
      );

      this.logger.log(`Created transfer: ${transfer.id} to account ${destinationAccountId} for ${amount / 100} ${currency}`);
      return transfer;
    } catch (error) {
      this.logger.error(`Error creating transfer: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Create a payout for connected account
  async createPayout(
    accountId: string,
    amount: number,
    currency: string = 'usd',
    metadata?: Record<string, string>
  ) {
    try {
      const payout = await this.connectedAccountsService.createPayout(
        accountId,
        amount,
        currency,
        metadata
      );

      this.logger.log(`Created payout: ${payout.id} for account ${accountId} for ${amount / 100} ${currency}`);
      return payout;
    } catch (error) {
      this.logger.error(`Error creating payout: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Create a payment with automatic transfer to connected account
  async createPaymentWithTransfer(
    connectedAccountId: string,
    amount: number,
    currency: string = 'usd',
    applicationFeeAmount?: number
  ) {
    try {
      const paymentIntent = await this.connectedAccountsService.createPaymentIntent(
        amount,
        currency,
        connectedAccountId,
        applicationFeeAmount
      );

      this.logger.log(`Created payment intent with transfer: ${paymentIntent.id} for account ${connectedAccountId}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error(`Error creating payment with transfer: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Create a checkout session for connected account
  async createConnectedCheckout(
    connectedAccountId: string,
    checkoutData: {
      successUrl: string;
      cancelUrl: string;
      lineItems: Array<{
        name: string;
        amount: number;
        currency: string;
        quantity: number;
      }>;
      applicationFeeAmount: number;
      metadata?: Record<string, string>;
    }
  ) {
    try {
      const session = await this.connectedAccountsService.createConnectedAccountCheckoutSession({
        connectedAccountId: connectedAccountId,
        applicationFeeAmount: checkoutData.applicationFeeAmount,
        successUrl: checkoutData.successUrl,
        cancelUrl: checkoutData.cancelUrl,
        lineItems: checkoutData.lineItems,
        metadata: checkoutData.metadata,
      });

      this.logger.log(`Created connected checkout session: ${session.id} for account ${connectedAccountId}`);
      return session;
    } catch (error) {
      this.logger.error(`Error creating connected checkout: ${error.message}`, error.stack);
      throw error;
    }
  }

  // List all connected accounts
  async listMerchantAccounts(limit: number = 10, startingAfter?: string) {
    try {
      return this.connectedAccountsService.listConnectedAccounts(limit, startingAfter);
    } catch (error) {
      this.logger.error(`Error listing connected accounts: ${error.message}`, error.stack);
      throw error;
    }
  }
}
```

## Common Issues and Troubleshooting

### Account Verification Issues

If a connected account has issues completing verification:

1. Check the account's `requirements` field to see what's missing:
   ```typescript
   const account = await stripeService.retrieveConnectedAccount(accountId);
   console.log(account.requirements.currently_due);
   ```

2. Generate a new account link with explicit collection parameters:
   ```typescript
   const accountLink = await connectedAccountsService.createAccountLink({
     accountId: accountId,
     refreshUrl: 'https://example.com/refresh',
     returnUrl: 'https://example.com/return',
     type: 'account_update',
     collect: 'currently_due'
   });
   ```

### Transfer Failures

If transfers fail, check the following:

1. Ensure the connected account has completed onboarding:
   ```typescript
   const account = await stripeService.retrieveConnectedAccount(accountId);
   if (!account.charges_enabled || !account.payouts_enabled) {
     throw new Error('Account is not fully onboarded yet');
   }
   ```

2. Verify your platform has sufficient funds:
   ```typescript
   const balance = await stripeClient.balance.retrieve();
   const availableBalance = balance.available.find(b => b.currency === 'usd')?.amount || 0;
   if (availableBalance < amount) {
     throw new Error('Insufficient funds on platform account');
   }
   ```

### Webhook Registration and Testing

1. Register webhooks in the Stripe dashboard:
   - Go to Developers > Webhooks > Add Endpoint
   - URL: `https://your-domain.com/stripe/webhook`
   - Events to listen for: 
     - `account.updated`
     - `account.application.authorized`
     - `account.application.deauthorized`
     - `transfer.created`
     - `transfer.failed`
     - `payout.created`
     - `payout.failed`

2. Test webhooks locally with the Stripe CLI:
   ```bash
   # Install Stripe CLI
   brew install stripe/stripe-cli/stripe

   # Login to your Stripe account
   stripe login

   # Forward events to your local server
   stripe listen --forward-to localhost:3000/stripe/webhook
   ```

3. Trigger test webhook events:
   ```bash
   # Trigger a specific event
   stripe trigger account.updated
   stripe trigger transfer.created
   ```

## Additional Features

### Monitoring Connected Account Status

Create a dashboard for monitoring the status of your connected accounts:

```typescript
// merchant.service.ts (additional method)
async getAccountOverview(accountId: string) {
  const [account, balance] = await Promise.all([
    this.connectedAccountsService.retrieveConnectedAccount(accountId),
    this.stripeClient.balance.retrieve({ stripeAccount: accountId })
  ]);

  // Get recent transfers
  const transfers = await this.stripeClient.transfers.list({
    destination: accountId,
    limit: 5
  });

  // Get recent payouts
  const payouts = await this.stripeClient.payouts.list({
    limit: 5
  }, {
    stripeAccount: accountId
  });

  return {
    account: {
      id: account.id,
      email: account.email,
      country: account.country,
      business_type: account.business_type,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      requirements: {
        currently_due: account.requirements?.currently_due || [],
        eventually_due: account.requirements?.eventually_due || [],
        pending_verification: account.requirements?.pending_verification || []
      }
    },
    balance: {
      available: balance.available.map(b => ({
        currency: b.currency,
        amount: b.amount / 100
      })),
      pending: balance.pending.map(b => ({
        currency: b.currency,
        amount: b.amount / 100
      }))
    },
    transfers: transfers.data.map(t => ({
      id: t.id,
      amount: t.amount / 100,
      currency: t.currency,
      created: new Date(t.created * 1000),
      description: t.description
    })),
    payouts: payouts.data.map(p => ({
      id: p.id,
      amount: p.amount / 100,
      currency: p.currency,
      created: new Date(p.created * 1000),
      status: p.status,
      arrival_date: p.arrival_date ? new Date(p.arrival_date * 1000) : null
    }))
  };
}
```

### Transaction Reporting

Create reports for connected account transactions:

```typescript
// merchant.service.ts (additional method)
async getTransactionReport(accountId: string, options: {
  startDate: Date;
  endDate: Date;
}) {
  // Convert dates to Unix timestamps
  const startTimestamp = Math.floor(options.startDate.getTime() / 1000);
  const endTimestamp = Math.floor(options.endDate.getTime() / 1000);

  // Get all transfers in the date range
  const transfers = await this.stripeClient.transfers.list({
    destination: accountId,
    created: {
      gte: startTimestamp,
      lte: endTimestamp
    },
    limit: 100
  });

  // Get all payouts in the date range
  const payouts = await this.stripeClient.payouts.list({
    created: {
      gte: startTimestamp,
      lte: endTimestamp
    },
    limit: 100
  }, {
    stripeAccount: accountId
  });

  // Calculate totals
  const transferTotal = transfers.data.reduce((sum, t) => sum + t.amount, 0);
  const payoutTotal = payouts.data.reduce((sum, p) => sum + p.amount, 0);

  return {
    period: {
      start: options.startDate,
      end: options.endDate
    },
    transfers: {
      count: transfers.data.length,
      total: transferTotal / 100,
      items: transfers.data.map(t => ({
        id: t.id,
        amount: t.amount / 100,
        currency: t.currency,
        created: new Date(t.created * 1000),
        description: t.description,
        metadata: t.metadata
      }))
    },
    payouts: {
      count: payouts.data.length,
      total: payoutTotal / 100,
      items: payouts.data.map(p => ({
        id: p.id,
        amount: p.amount / 100,
        currency: p.currency,
        created: new Date(p.created * 1000),
        status: p.status,
        arrival_date: p.arrival_date ? new Date(p.arrival_date * 1000) : null,
        method: p.method,
        description: p.description
      }))
    }
  };
}
```

## Security Considerations

### Validation and Error Handling

Always validate inputs and implement proper error handling:

```typescript
@Post(':id/transfers')
async transferFunds(
  @Param('id') accountId: string,
  @Body() transferData: {
    amount: number;
    currency?: string;
    description?: string;
  },
) {
  // Input validation
  if (!accountId || !transferData.amount || transferData.amount <= 0) {
    throw new BadRequestException('Invalid transfer parameters');
  }

  try {
    // First check if account is valid and capable of receiving transfers
    const account = await this.merchantService.retrieveMerchantAccount(accountId);
    if (!account.payouts_enabled) {
      throw new BadRequestException('Account not ready for transfers');
    }

    return this.merchantService.transferFunds(
      accountId,
      transferData.amount,
      transferData.currency || 'usd',
      transferData.description
    );
  } catch (error) {
    // Handle Stripe errors specifically
    if (error.type === 'StripeInvalidRequestError') {
      throw new BadRequestException(error.message);
    }
    
    // Handle unexpected errors
    this.logger.error(`Transfer error: ${error.message}`, error.stack);
    throw new InternalServerErrorException('Failed to process transfer');
  }
}
```

### Rate Limiting and Abuse Prevention

Implement rate limiting for sensitive operations:

```typescript
// Using a NestJS rate limiting interceptor
@UseInterceptors(RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 transfers per windowMs
  message: 'Too many transfer attempts, please try again later'
}))
@Post(':id/transfers')
async transferFunds(...) {
  // Implementation
}
```

### Permission Checks

Ensure users can only operate on accounts they own:

```typescript
@Post(':id/transfers')
async transferFunds(
  @Param('id') accountId: string,
  @Body() transferData: any,
  @User() currentUser: UserEntity
) {
  // Check if user owns this connected account
  const accountOwnership = await this.merchantService.verifyAccountOwnership(
    accountId, 
    currentUser.id
  );
  
  if (!accountOwnership.isOwner) {
    throw new ForbiddenException('You do not have permission to transfer funds from this account');
  }
  
  // Proceed with transfer
  // ...
}
```

## Complete Integration Flow

Here's a summary of the full integration flow for Stripe Connect:

1. **Account Creation**
   - Create a Stripe Connect Express account
   - Generate an onboarding link
   - Redirect the user to complete onboarding
   - Monitor account status via webhooks

2. **Bank Account Setup**
   - Either collect bank details via your form or
   - Use Stripe's hosted account update flow
   - Verify bank account status

3. **Payment Flow**
   - Option 1: Direct transfers from your platform to connected accounts
   - Option 2: Payment Intents with automatic transfers
   - Option 3: Checkout Sessions with transfers
   - Option 4: Create payouts from connected account balance

4. **Monitoring and Reporting**
   - Monitor connect account status
   - Track transfers and payouts
   - Generate transaction reports
   - Handle webhook events for status updates

## Testing

To ensure your implementation works correctly, test the following scenarios:

1. **Create a test connected account**
   ```bash
   curl -X POST http://localhost:3000/api/merchants \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","country":"US"}'
   ```

2. **Transfer funds to the connected account**
   ```bash
   curl -X POST http://localhost:3000/api/merchants/acct_123456/transfers \
     -H "Content-Type: application/json" \
     -d '{"amount":1000,"currency":"usd","description":"Test transfer"}'
   ```

3. **Create a checkout session for the connected account**
   ```bash
   curl -X POST http://localhost:3000/api/merchants/acct_123456/checkout-sessions \
     -H "Content-Type: application/json" \
     -d '{
       "successUrl": "http://localhost:3000/success",
       "cancelUrl": "http://localhost:3000/cancel",
       "lineItems": [
         {"name": "Test Product", "amount": 2000, "currency": "usd", "quantity": 1}
       ],
       "applicationFeeAmount": 200
     }'
   ```

## Conclusion

By following this guide, you've learned how to:

1. Create and onboard Stripe Connect accounts
2. Set up bank accounts for receiving funds
3. Transfer funds to connected accounts using various methods
4. Monitor account status and transactions
5. Implement proper error handling and security measures

This implementation gives you a solid foundation for building a marketplace, platform, or any application that needs to facilitate payments between users.

Remember to always test thoroughly in Stripe's test mode before going live, and keep your webhook handlers updated to respond to any changes in account status or payment events.

## Resources

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Stripe API Reference](https://stripe.com/docs/api)
- [NestJS Documentation](https://docs.nestjs.com/)
- [@reyco1/nestjs-stripe Package](https://github.com/reyco1/nestjs-stripe)