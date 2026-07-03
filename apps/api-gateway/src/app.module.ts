import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth/auth.controller';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { EcomController } from './ecom/ecom.controller';
import { EpidietController } from './epidiet/epidiet.controller';
import { PaymentsController } from './payments/payments.controller';
import { TemptattoController } from './temptatto/temptatto.controller';
import { UsersController } from './users/users.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m') },
      }),
    }),
    // Default throttler config (generous). The OTP request route applies a
    // much tighter override via @Throttle — see auth/auth.controller.ts.
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          name: 'default',
          ttl: Number(configService.get('RATE_LIMIT_TTL_SECONDS', 60)) * 1000,
          limit: Number(configService.get('RATE_LIMIT_DEFAULT_LIMIT', 100)),
        },
      ],
    }),
  ],
  controllers: [
    AuthController,
    UsersController,
    PaymentsController,
    EpidietController,
    EcomController,
    TemptattoController,
  ],
  providers: [JwtAuthGuard],
})
export class AppModule {}
