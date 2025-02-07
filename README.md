# @reyco1/nestjs-stripe 🚀

A powerful NestJS module for Stripe integration that supports both one-time payments and subscriptions. This package provides a seamless way to integrate Stripe payment processing into your NestJS application.

## Overview 🛠️

When installed, this package will:

1. Add required imports to your `app.module.ts`:
   - ConfigService from @nestjs/config
   - StripeModule from @reyco1/nestjs-stripe

2. Configure the StripeModule with async configuration using ConfigService

3. Add necessary environment variables to your `.env` and `.env.example` files:
   ```env
   STRIPE_API_KEY=your_stripe_secret_key
   STRIPE_API_VERSION=your_stripe_api_version
   STRIPE_WEBHOOK_SECRET=your_webhook_secret
   ```

## Features ✨

- 💳 One-time payment processing
- 🔄 Subscription management
- 👥 Customer management
- 🎣 Webhook handling
- 📝 TypeScript support
- 🔌 Auto-configuration setup
- 🔧 Environment variables management

## Installation 📦

```bash
# Install the package
npm install @reyco1/nestjs-stripe

# Run the configuration script (if automatic setup didn't run)
npx @reyco1/nestjs-stripe
```

## Usage 💡

### Creating a One-Time Payment 💰

```typescript
import { StripeService } from '@reyco1/nestjs-stripe';

@Injectable()
export class PaymentService {
  constructor(private readonly stripeService: StripeService) {}

  async createPayment() {
    const payment = await this.stripeService.createPaymentIntent({
      amount: 1000, // amount in cents
      currency: 'usd',
      metadata: {
        userId: '123',
        orderId: 'ORDER_123'
      }
    });
    return payment;
  }
}
```

### Managing Subscriptions 📅

```typescript
@Injectable()
export class SubscriptionService {
  constructor(private readonly stripeService: StripeService) {}

  async createSubscription(customerId: string, priceId: string) {
    const subscription = await this.stripeService.createSubscription({
      customerId,
      priceId,
      metadata: {
        userId: '123',
        plan: 'premium'
      }
    });
    return subscription;
  }
}
```

### Handling Webhooks 🎣

```typescript
@Controller('stripe/webhooks')
export class StripeWebhookController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly userService: UserService,
  ) {}

  @Post()
  async handleWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const event = await this.stripeService.createWebhookEvent(
      request.rawBody,
      signature,
      'your_webhook_secret'
    );

    switch (event.type) {
      // Handle one-time payment success
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        // Access metadata from the payment intent
        const { userId, orderId } = paymentIntent.metadata;
        
        await this.userService.updatePayment({
          userId,
          orderId,
          status: 'paid',
          amount: paymentIntent.amount,
          paymentIntentId: paymentIntent.id
        });
        break;
      }

      // Handle subscription created
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        // Access metadata from the subscription
        const { userId, plan } = subscription.metadata;

        await this.userService.updateSubscription({
          userId,
          plan,
          status: subscription.status,
          subscriptionId: subscription.id,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000)
        });
        break;
      }

      // Handle subscription updated
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const { userId } = subscription.metadata;

        await this.userService.updateSubscription({
          userId,
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000)
        });
        break;
      }

      // Handle subscription cancelled/deleted
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const { userId } = subscription.metadata;

        await this.userService.cancelSubscription(userId);
        break;
      }

      // Handle payment failure
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscription = await this.stripeService.retrieveSubscription(
          invoice.subscription as string
        );
        const { userId } = subscription.metadata;

        await this.userService.notifyPaymentFailure(userId);
        break;
      }
    }

    return { received: true };
  }
}
```

Here's an example of the UserService interface that would handle these webhook events:

```typescript
interface UserService {
  updatePayment(data: {
    userId: string;
    orderId: string;
    status: string;
    amount: number;
    paymentIntentId: string;
  }): Promise<void>;

  updateSubscription(data: {
    userId: string;
    plan?: string;
    status: string;
    subscriptionId?: string;
    currentPeriodEnd: Date;
  }): Promise<void>;

  cancelSubscription(userId: string): Promise<void>;
  
  notifyPaymentFailure(userId: string): Promise<void>;
}
```

💡 **Key Points About Metadata**:

1. When creating a payment or subscription, add metadata:
```typescript
// Creating payment with metadata
const payment = await stripeService.createPaymentIntent({
  amount: 1000,
  currency: 'usd',
  metadata: {
    userId: user.id,
    orderId: order.id
  }
});

// Creating subscription with metadata
const subscription = await stripeService.createSubscription({
  customerId: customer.id,
  priceId: price.id,
  metadata: {
    userId: user.id,
    plan: 'premium'
  }
});
```

2. Access metadata in webhooks:
```typescript
// In payment webhooks
const { userId, orderId } = paymentIntent.metadata;

// In subscription webhooks
const { userId, plan } = subscription.metadata;
```

3. Best practices for metadata:
- Always include `userId` to link back to your database
- Keep metadata values simple and string-based
- Don't store sensitive information in metadata
- Use consistent keys across your application

## API Reference 📚

### StripeService Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `createPaymentIntent` | Create a one-time payment | `CreatePaymentDto` | `Promise<Stripe.PaymentIntent>` |
| `createSubscription` | Create a subscription | `CreateSubscriptionDto` | `Promise<Stripe.Subscription>` |
| `createCustomer` | Create a Stripe customer | `email: string, name?: string` | `Promise<Stripe.Customer>` |
| `cancelSubscription` | Cancel a subscription | `subscriptionId: string` | `Promise<Stripe.Subscription>` |
| `retrieveSubscription` | Get subscription details | `subscriptionId: string` | `Promise<Stripe.Subscription>` |
| `createWebhookEvent` | Handle webhook events | `payload: Buffer, signature: string, webhookSecret: string` | `Promise<Stripe.Event>` |

## Configuration Options ⚙️

The StripeModule can be configured with the following options:

```typescript
StripeModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    apiKey: configService.get('STRIPE_API_KEY'),
    apiVersion: configService.get('STRIPE_API_VERSION'),
    webhookSecret: configService.get('STRIPE_WEBHOOK_SECRET'),
  }),
})
```

## Troubleshooting 🔍

If the automatic configuration didn't run:

1. Run it manually:
   ```bash
   npx @reyco1/nestjs-stripe
   ```

2. Check your environment variables are properly set in `.env`

3. Ensure ConfigModule is properly imported in your app.module.ts

## Contributing 🤝

Contributions are welcome! Please feel free to submit a Pull Request.

## License 📄

MIT

---

Made with ❤️ by Reyco1