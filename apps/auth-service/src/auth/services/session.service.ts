import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as crypto from 'crypto';
import { Model } from 'mongoose';
import { Session, SessionDocument } from '../schemas/session.schema';

export interface DeviceInfo {
  deviceId?: string;
  deviceName?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface IssuedSession {
  refreshToken: string;
  expiresAt: Date;
  sessionFamilyId: string;
}

export interface RotatedSession extends IssuedSession {
  authUserId: string;
}

@Injectable()
export class SessionService {
  constructor(
    @InjectModel(Session.name) private readonly sessionModel: Model<SessionDocument>,
    private readonly configService: ConfigService,
  ) {}

  private hashToken(token: string): string {
    const secret = this.configService.get<string>('REFRESH_TOKEN_HASH_SECRET') ?? 'refresh_token_hash_secret_change_this';
    return crypto.createHmac('sha256', secret).update(token).digest('hex');
  }

  private generateToken(): string {
    return crypto.randomBytes(48).toString('hex');
  }

  private expiresAt(): Date {
    const days = Number(this.configService.get('REFRESH_TOKEN_EXPIRES_IN_DAYS') ?? 30);
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  /** Issues a brand new session (new login). */
  async createSession(authUserId: string, device: DeviceInfo = {}): Promise<IssuedSession> {
    const refreshToken = this.generateToken();
    const sessionFamilyId = crypto.randomUUID();
    const expiresAt = this.expiresAt();

    await this.sessionModel.create({
      authUserId,
      refreshTokenHash: this.hashToken(refreshToken),
      sessionFamilyId,
      ...device,
      expiresAt,
    });

    return { refreshToken, expiresAt, sessionFamilyId };
  }

  /**
   * Verifies a refresh token, revokes it, and issues a new one in the same
   * session family (rotation). Throws if the token is unknown, expired, or
   * already revoked (which also indicates possible token theft/replay).
   */
  async rotateSession(refreshToken: string, device: DeviceInfo = {}): Promise<RotatedSession> {
    const tokenHash = this.hashToken(refreshToken);
    const session = await this.sessionModel.findOne({ refreshTokenHash: tokenHash });

    if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    session.revokedAt = new Date();
    session.lastUsedAt = new Date();
    await session.save();

    const newRefreshToken = this.generateToken();
    const expiresAt = this.expiresAt();

    await this.sessionModel.create({
      authUserId: session.authUserId,
      refreshTokenHash: this.hashToken(newRefreshToken),
      sessionFamilyId: session.sessionFamilyId,
      deviceId: device.deviceId ?? session.deviceId,
      deviceName: device.deviceName ?? session.deviceName,
      userAgent: device.userAgent ?? session.userAgent,
      ipAddress: device.ipAddress ?? session.ipAddress,
      expiresAt,
    });

    return {
      refreshToken: newRefreshToken,
      expiresAt,
      sessionFamilyId: session.sessionFamilyId,
      authUserId: session.authUserId,
    };
  }

  /** Idempotent: revokes the session if the token is known, no-ops otherwise. */
  async revokeSession(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    await this.sessionModel.updateOne(
      { refreshTokenHash: tokenHash, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } },
    );
  }
}
