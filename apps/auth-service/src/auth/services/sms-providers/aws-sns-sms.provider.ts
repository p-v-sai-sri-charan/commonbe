import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsProvider, SmsProviderId } from './sms-provider.interface';

/**
 * Placeholder AWS SNS integration.
 * Real implementation: use `@aws-sdk/client-sns`, e.g.
 *   const sns = new SNSClient({ region: AWS_REGION });
 *   await sns.send(new PublishCommand({ PhoneNumber: mobileNumber, Message: `Your OTP is ${otp}` }));
 */
@Injectable()
export class AwsSnsSmsProvider implements SmsProvider {
  readonly id = SmsProviderId.AWS_SNS;
  private readonly logger = new Logger(AwsSnsSmsProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async send(mobileNumber: string, otp: string): Promise<void> {
    const region = this.configService.get<string>('AWS_REGION');
    // TODO: replace with a real call to the AWS SNS SDK once credentials are available.
    this.logger.log(`[aws_sns placeholder] would send OTP ${otp} to ${mobileNumber} region=${region ?? 'unset'}`);
  }
}
