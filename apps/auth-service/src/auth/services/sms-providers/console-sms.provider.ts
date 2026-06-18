import { Injectable, Logger } from '@nestjs/common';
import { SmsProvider, SmsProviderId } from './sms-provider.interface';

/** Default local-dev provider: just logs the OTP, never sends anything. */
@Injectable()
export class ConsoleSmsProvider implements SmsProvider {
  readonly id = SmsProviderId.CONSOLE;
  private readonly logger = new Logger(ConsoleSmsProvider.name);

  async send(mobileNumber: string, otp: string): Promise<void> {
    this.logger.log(`[console] OTP for ${mobileNumber}: ${otp}`);
  }
}
