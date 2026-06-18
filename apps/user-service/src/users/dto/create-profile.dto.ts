import { IsEmail, IsObject, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateProfileDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @IsOptional()
  @IsObject()
  preferences?: Record<string, unknown>;

  /** Referral code entered at signup (if any). Only honored on first creation. */
  @IsOptional()
  @IsString()
  referredByCode?: string;
}
