import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GoogleLoginDto } from './dto/google-login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { AuthProvider, AuthUser, AuthUserDocument } from './schemas/auth-user.schema';
import { OtpPurpose } from './schemas/otp.schema';
import { AuthEventsService } from './services/auth-events.service';
import { GoogleAuthService } from './services/google-auth.service';
import { OtpService } from './services/otp.service';
import { DeviceInfo, SessionService } from './services/session.service';

const INDIAN_MOBILE_E164_REGEX = /^\+91[6-9]\d{9}$/;

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(AuthUser.name) private readonly authUserModel: Model<AuthUserDocument>,
    private readonly otpService: OtpService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly jwtService: JwtService,
    private readonly sessionService: SessionService,
    private readonly authEventsService: AuthEventsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Grants the admin role to mobile numbers listed in ADMIN_MOBILE_NUMBERS
   * (comma-separated, any format normalizeIndianMobile accepts). Grant-only:
   * removing a number from the env does not revoke an already-granted role —
   * revoke by editing the user document directly.
   */
  private async syncAdminRole(user: AuthUserDocument): Promise<void> {
    if (!user.mobileNumber || user.roles.includes('admin')) return;
    const raw = this.configService.get<string>('ADMIN_MOBILE_NUMBERS', '');
    if (!raw) return;
    const adminNumbers = raw
      .split(',')
      .map((n) => {
        try {
          return this.normalizeIndianMobile(n.trim());
        } catch {
          return null;
        }
      })
      .filter((n): n is string => n !== null);
    if (adminNumbers.includes(user.mobileNumber)) {
      user.roles.push('admin');
      await user.save();
    }
  }

  /** Normalizes Indian mobile numbers to E.164 (+91XXXXXXXXXX) and validates them. */
  private normalizeIndianMobile(raw: string): string {
    const stripped = raw.replace(/[^\d+]/g, '');
    let normalized = stripped;

    if (!normalized.startsWith('+') && normalized.startsWith('91') && normalized.length === 12) {
      normalized = `+${normalized}`;
    } else if (normalized.startsWith('0') && normalized.length === 11) {
      normalized = `+91${normalized.slice(1)}`;
    } else if (normalized.length === 10) {
      normalized = `+91${normalized}`;
    }

    if (!INDIAN_MOBILE_E164_REGEX.test(normalized)) {
      throw new BadRequestException('Invalid Indian mobile number');
    }
    return normalized;
  }

  private issueAccessToken(user: AuthUserDocument): string {
    const payload = {
      sub: user._id.toString(),
      mobileNumber: user.mobileNumber,
      email: user.email,
      roles: user.roles,
      apps: user.apps,
      permissions: user.permissions,
    };
    return this.jwtService.sign(payload);
  }

  private toPublicUser(user: AuthUserDocument) {
    return {
      id: user._id.toString(),
      mobileNumber: user.mobileNumber,
      mobileVerified: user.mobileVerified,
      email: user.email,
      emailVerified: user.emailVerified,
      authProviders: user.authProviders,
      roles: user.roles,
      apps: user.apps,
      permissions: user.permissions,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
    };
  }

  private assertActive(user: AuthUserDocument) {
    if (!user.isActive) {
      throw new ForbiddenException('This account has been disabled');
    }
  }

  /** Issues an access token + a brand new refresh-token session for this login. */
  private async issueTokens(user: AuthUserDocument, device: DeviceInfo) {
    const accessToken = this.issueAccessToken(user);
    const session = await this.sessionService.createSession(user._id.toString(), device);
    return {
      accessToken,
      refreshToken: session.refreshToken,
      refreshTokenExpiresAt: session.expiresAt,
      user: this.toPublicUser(user),
    };
  }

  async requestOtp(dto: RequestOtpDto) {
    const mobileNumber = this.normalizeIndianMobile(dto.mobileNumber);
    const existingUser = await this.authUserModel.findOne({ mobileNumber });
    const purpose = existingUser ? OtpPurpose.LOGIN : OtpPurpose.SIGNUP;

    const { otp, expiresAt } = await this.otpService.requestOtp(mobileNumber, purpose);

    return {
      message: 'OTP sent successfully',
      mobileNumber,
      purpose,
      expiresAt,
      // Only present outside production (see OtpService).
      ...(otp ? { otp } : {}),
    };
  }

  async verifyOtp(dto: VerifyOtpDto, device: DeviceInfo = {}) {
    const mobileNumber = this.normalizeIndianMobile(dto.mobileNumber);
    let user = await this.authUserModel.findOne({ mobileNumber });
    const purpose = user ? OtpPurpose.LOGIN : OtpPurpose.SIGNUP;
    const isNewUser = !user;

    await this.otpService.verifyOtp(mobileNumber, purpose, dto.otp);

    if (!user) {
      // Auto-create the user on first successful OTP verification (signup).
      user = await this.authUserModel.create({
        mobileNumber,
        mobileVerified: true,
        authProviders: [AuthProvider.MOBILE],
        roles: ['user'],
        apps: [],
        permissions: [],
        isActive: true,
        lastLoginAt: new Date(),
      });
    } else {
      this.assertActive(user);
      user.mobileVerified = true;
      if (!user.authProviders.includes(AuthProvider.MOBILE)) {
        user.authProviders.push(AuthProvider.MOBILE);
      }
      user.lastLoginAt = new Date();
      await user.save();
    }

    await this.syncAdminRole(user);

    const deviceInfo: DeviceInfo = { deviceId: dto.deviceId, deviceName: dto.deviceName, ...device };
    const result = await this.issueTokens(user, deviceInfo);

    const eventUser = { id: user._id.toString(), mobileNumber: user.mobileNumber, email: user.email };
    if (isNewUser) {
      this.authEventsService.userCreated(eventUser, 'mobile');
    }
    this.authEventsService.userLogin(eventUser, 'mobile');

    return result;
  }

  async googleLogin(dto: GoogleLoginDto, device: DeviceInfo = {}) {
    const profile = await this.googleAuthService.verifyIdToken(dto.idToken);

    let user = await this.authUserModel.findOne({ googleId: profile.googleId });

    // Link to an existing record if the same (already-known) email matches.
    // This covers: "link Google account to existing user if same email ...
    // is later verified" — e.g. a mobile-first user whose email was set
    // via their profile and now signs in with Google using that email.
    if (!user && profile.email) {
      user = await this.authUserModel.findOne({ email: profile.email });
    }

    const isNewUser = !user;

    if (!user) {
      user = await this.authUserModel.create({
        email: profile.email,
        emailVerified: profile.emailVerified,
        googleId: profile.googleId,
        authProviders: [AuthProvider.GOOGLE],
        roles: ['user'],
        apps: [],
        permissions: [],
        isActive: true,
        lastLoginAt: new Date(),
      });
    } else {
      this.assertActive(user);
      user.googleId = user.googleId ?? profile.googleId;
      user.email = user.email ?? profile.email;
      user.emailVerified = user.emailVerified || profile.emailVerified;
      if (!user.authProviders.includes(AuthProvider.GOOGLE)) {
        user.authProviders.push(AuthProvider.GOOGLE);
      }
      user.lastLoginAt = new Date();
      await user.save();
    }

    const deviceInfo: DeviceInfo = { deviceId: dto.deviceId, deviceName: dto.deviceName, ...device };
    const result = await this.issueTokens(user, deviceInfo);

    const eventUser = { id: user._id.toString(), mobileNumber: user.mobileNumber, email: user.email };
    if (isNewUser) {
      this.authEventsService.userCreated(eventUser, 'google');
    }
    this.authEventsService.userLogin(eventUser, 'google');

    return result;
  }

  /** Rotates a refresh token and issues a fresh access token. */
  async refresh(dto: RefreshTokenDto, device: DeviceInfo = {}) {
    const deviceInfo: DeviceInfo = { deviceId: dto.deviceId, deviceName: dto.deviceName, ...device };
    const rotated = await this.sessionService.rotateSession(dto.refreshToken, deviceInfo);

    const user = await this.authUserModel.findById(rotated.authUserId);
    if (!user) {
      throw new ForbiddenException('Account no longer exists');
    }
    this.assertActive(user);

    const accessToken = this.issueAccessToken(user);
    return {
      accessToken,
      refreshToken: rotated.refreshToken,
      refreshTokenExpiresAt: rotated.expiresAt,
      user: this.toPublicUser(user),
    };
  }

  /** Revokes a refresh token (single-session logout). Always succeeds. */
  async logout(dto: LogoutDto) {
    await this.sessionService.revokeSession(dto.refreshToken);
    return { message: 'Logged out successfully' };
  }
}
