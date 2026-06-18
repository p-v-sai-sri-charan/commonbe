import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsProvider, SmsProviderId } from './sms-provider.interface';

/**
 * Placeholder MSG91 integration.
 * Real implementation: call MSG91's OTP/SMS API, e.g.
 *   POST https://control.msg91.com/api/v5/otp
 *   headers: { authkey: MSG91_AUTH_KEY }
 *   body: { mobile: mobileNumber, otp, template_id: MSG91_TEMPLATE_ID }
 */
@Injectable()
export class Msg91SmsProvider implements SmsProvider {
  readonly id = SmsProviderId.MSG91;
  private readonly logger = new Logger(Msg91SmsProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async send(mobileNumber: string, otp: string): Promise<void> {
    const authKey = this.configService.get<string>('MSG91_AUTH_KEY');
    const templateId = this.configService.get<string>('MSG91_TEMPLATE_ID');
    // TODO: replace with a real HTTP call to MSG91 once credentials are available.
    this.logger.log(
      `[msg91 placeholder] would send OTP ${otp} to ${mobileNumber} using authKey=${authKey ? '***' : 'unset'} template=${templateId ?? 'unset'}`,
    );
  }
}
