import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as crypto from 'crypto';
import { Model } from 'mongoose';
import { Otp, OtpDocument, OtpPurpose, OtpStatus } from '../schemas/otp.schema';
import { SmsService } from './sms.service';

export interface RequestOtpResult {
  /** Only populated outside production, for local testing. */
  otp?: string;
  expiresAt: Date;
}

@Injectable()
export class OtpService {
  constructor(
    @InjectModel(Otp.name) private readonly otpModel: Model<OtpDocument>,
    private readonly configService: ConfigService,
    private readonly smsService: SmsService,
  ) {}

  private hashOtp(mobileNumber: string, purpose: OtpPurpose, otp: string): string {
    const secret = this.configService.get<string>('OTP_HASH_SECRET') ?? 'otp_hash_secret_change_this';
    return crypto.createHmac('sha256', secret).update(`${mobileNumber}:${purpose}:${otp}`).digest('hex');
  }

  private generateOtp(): string {
    return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  async requestOtp(mobileNumber: string, purpose: OtpPurpose): Promise<RequestOtpResult> {
    const otp = this.generateOtp();
    const otpHash = this.hashOtp(mobileNumber, purpose, otp);

    const expiresInMinutes = Number(this.configService.get('OTP_EXPIRES_IN_MINUTES') ?? 5);
    const maxAttempts = Number(this.configService.get('OTP_MAX_ATTEMPTS') ?? 5);
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    // Invalidate any previous still-pending OTP for the same mobile+purpose
    // so only the most recently requested OTP can ever be verified.
    await this.otpModel.updateMany(
      { mobileNumber, purpose, status: OtpStatus.PENDING },
      { $set: { status: OtpStatus.EXPIRED } },
    );

    await this.otpModel.create({
      mobileNumber,
      purpose,
      otpHash,
      status: OtpStatus.PENDING,
      attempts: 0,
      maxAttempts,
      expiresAt,
    });

    await this.smsService.sendOtp(mobileNumber, otp);

    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    return { otp: isProduction ? undefined : otp, expiresAt };
  }

  /**
   * Verifies and consumes (single-use) the most recent pending OTP for the
   * given mobile number + purpose. Throws on any failure case.
   */
  async verifyOtp(mobileNumber: string, purpose: OtpPurpose, otp: string): Promise<void> {
    const record = await this.otpModel
      .findOne({ mobileNumber, purpose, status: OtpStatus.PENDING })
      .sort({ createdAt: -1 });

    if (!record) {
      throw new BadRequestException('No pending OTP found. Please request a new OTP.');
    }

    if (record.expiresAt.getTime() < Date.now()) {
      record.status = OtpStatus.EXPIRED;
      await record.save();
      throw new BadRequestException('OTP has expired. Please request a new OTP.');
    }

    if (record.attempts >= record.maxAttempts) {
      record.status = OtpStatus.FAILED;
      await record.save();
      throw new BadRequestException('Maximum OTP attempts exceeded. Please request a new OTP.');
    }

    const candidateHash = this.hashOtp(mobileNumber, purpose, otp);
    if (candidateHash !== record.otpHash) {
      record.attempts += 1;
      if (record.attempts >= record.maxAttempts) {
        record.status = OtpStatus.FAILED;
      }
      await record.save();
      throw new BadRequestException('Invalid OTP.');
    }

    // Single-use: mark as verified so it can never be replayed.
    record.status = OtpStatus.VERIFIED;
    await record.save();
  }
}
