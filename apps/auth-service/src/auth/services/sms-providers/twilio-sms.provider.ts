import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsProvider, SmsProviderId } from './sms-provider.interface';
import twilio from 'twilio';

/**
 * Twilio integration for sending OTP messages.
 */
@Injectable()
export class TwilioSmsProvider implements SmsProvider {
  readonly id = SmsProviderId.TWILIO;
  private readonly logger = new Logger(TwilioSmsProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async send(mobileNumber: string, otp: string): Promise<void> {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    const fromNumber = this.configService.get<string>('TWILIO_FROM_NUMBER');

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER must be set');
    }

    const client = twilio(accountSid, authToken);
    await client.messages.create({
      to: mobileNumber,
      from: fromNumber,
      body: `Your OTP is ${otp}`,
    });

    this.logger.log(`Sent OTP to ${mobileNumber} via Twilio ${otp}`);
  }
}

