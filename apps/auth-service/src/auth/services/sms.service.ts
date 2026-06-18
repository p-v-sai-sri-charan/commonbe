import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AwsSnsSmsProvider } from './sms-providers/aws-sns-sms.provider';
import { ConsoleSmsProvider } from './sms-providers/console-sms.provider';
import { FirebaseSmsProvider } from './sms-providers/firebase-sms.provider';
import { Msg91SmsProvider } from './sms-providers/msg91-sms.provider';
import { SmsProvider, SmsProviderId } from './sms-providers/sms-provider.interface';
import { TwilioSmsProvider } from './sms-providers/twilio-sms.provider';

/**
 * Dispatches OTP sending to whichever provider is selected via SMS_PROVIDER.
 *
 * Callers (OtpService) only ever see `sendOtp(mobileNumber, otp)` — adding
 * a new provider or switching providers in production is a one-line env
 * change (SMS_PROVIDER=msg91|twilio|aws_sns|firebase|console), no code
 * changes needed at the call site.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly providers: Map<SmsProviderId, SmsProvider>;

  constructor(
    private readonly configService: ConfigService,
    consoleProvider: ConsoleSmsProvider,
    msg91Provider: Msg91SmsProvider,
    twilioProvider: TwilioSmsProvider,
    awsSnsProvider: AwsSnsSmsProvider,
    firebaseProvider: FirebaseSmsProvider,
  ) {
    this.providers = new Map(
      [consoleProvider, msg91Provider, twilioProvider, awsSnsProvider, firebaseProvider].map((provider) => [
        provider.id,
        provider,
      ]),
    );
  }

  private resolveProvider(): SmsProvider {
    const configured = (this.configService.get<string>('SMS_PROVIDER') ?? SmsProviderId.CONSOLE) as SmsProviderId;
    const provider = this.providers.get(configured);
    if (!provider) {
      this.logger.warn(`Unknown SMS_PROVIDER "${configured}", falling back to console provider`);
      return this.providers.get(SmsProviderId.CONSOLE)!;
    }
    return provider;
  }

  async sendOtp(mobileNumber: string, otp: string): Promise<void> {
    await this.resolveProvider().send(mobileNumber, otp);
  }
}
