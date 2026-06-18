export enum SmsProviderId {
  CONSOLE = 'console',
  MSG91 = 'msg91',
  TWILIO = 'twilio',
  AWS_SNS = 'aws_sns',
  FIREBASE = 'firebase',
}

export interface SmsProvider {
  readonly id: SmsProviderId;
  send(mobileNumber: string, otp: string): Promise<void>;
}
