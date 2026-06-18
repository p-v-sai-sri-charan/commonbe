import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GoogleLoginDto {
  /** The ID token returned by Google Sign-In on the client. */
  @IsString()
  @IsNotEmpty()
  idToken: string;

  /** Optional client-generated device fingerprint, used for session tracking. */
  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  deviceName?: string;
}
