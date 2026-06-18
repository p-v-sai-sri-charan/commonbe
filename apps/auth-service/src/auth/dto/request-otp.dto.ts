import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class RequestOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^(\+?91)?[6-9]\d{9}$/, {
    message: 'mobileNumber must be a valid Indian mobile number (e.g. +919876543210)',
  })
  mobileNumber: string;
}
