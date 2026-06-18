import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsProvider, SmsProviderId } from './sms-provider.interface';

/**
 * Placeholder Twilio integration.
 * Real implementation: use the `twilio` SDK, e.g.
 *   const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
 *   await client.messages.create({ to: mobileNumber, from: TWILIO_FROM_NUMBER, body: `Your OTP is ${otp}` });
 */
@Injectable()
export class TwilioSmsProvider implements SmsProvider {
  readonly id = SmsProviderId.TWILIO;
  private readonly logger = new Logger(TwilioSmsProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async send(mobileNumber: string, otp: string): Promise<void> {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const fromNumber = this.configService.get<string>('TWILIO_FROM_NUMBER');
    // TODO: replace with a real call to the Twilio SDK once credentials are available.
    this.logger.log(
      `[twilio placeholder] would send OTP ${otp} to ${mobileNumber} from=${fromNumber ?? 'unset'} sid=${accountSid ? '***' : 'unset'}`,
    );
  }
}
