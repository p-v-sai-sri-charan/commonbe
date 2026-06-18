import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsProvider, SmsProviderId } from './sms-provider.interface';

/**
 * Placeholder Firebase Phone Auth integration.
 *
 * Note: Firebase Phone Auth is normally driven from the *client* SDK
 * (it performs the reCAPTCHA + SMS challenge itself), so the backend's role
 * is usually limited to verifying the resulting Firebase ID token rather
 * than sending the OTP itself. This placeholder is kept for interface
 * symmetry with the other providers in case you proxy OTP sending through
 * the Admin SDK / a custom flow.
 */
@Injectable()
export class FirebaseSmsProvider implements SmsProvider {
  readonly id = SmsProviderId.FIREBASE;
  private readonly logger = new Logger(FirebaseSmsProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async send(mobileNumber: string, otp: string): Promise<void> {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    // TODO: integrate Firebase Admin SDK / custom flow once credentials are available.
    this.logger.log(`[firebase placeholder] would send OTP ${otp} to ${mobileNumber} project=${projectId ?? 'unset'}`);
  }
}
