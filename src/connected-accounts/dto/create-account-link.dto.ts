export class CreateAccountLinkDto {
    accountId: string;
    refreshUrl: string;
    returnUrl: string;
    type?: 'account_onboarding' | 'account_update';
    collect?: 'currently_due' | 'eventually_due';
  }