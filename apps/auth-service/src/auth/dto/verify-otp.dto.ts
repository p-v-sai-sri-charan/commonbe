import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^(\+?91)?[6-9]\d{9}$/, {
    message: 'mobileNumber must be a valid Indian mobile number (e.g. +919876543210)',
  })
  mobileNumber: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'otp must be a 6 digit numeric code' })
  otp: string;

  /** Optional client-generated device fingerprint, used for session tracking. */
  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  deviceName?: string;
}
