import { ModuleMetadata, Type } from '@nestjs/common';
import { StripeConfig } from './stripe-config.interface';

export interface StripeOptionsFactory {
  createStripeOptions(): Promise<StripeConfig> | StripeConfig;
}

export interface StripeModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<StripeOptionsFactory>;
  useClass?: Type<StripeOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<StripeConfig> | StripeConfig;
  inject?: any[];
}
