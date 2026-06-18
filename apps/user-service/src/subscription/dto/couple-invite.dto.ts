import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class SendCoupleInviteDto {
  /** E.164 mobile number of the partner to invite (e.g. +919876543210). */
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{6,14}$/, { message: 'partnerMobile must be a valid E.164 number' })
  partnerMobile: string;
}

export class AcceptCoupleInviteDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}
