import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthUser, AuthUserSchema } from './schemas/auth-user.schema';
import { Otp, OtpSchema } from './schemas/otp.schema';
import { Session, SessionSchema } from './schemas/session.schema';
import { AuthEventsService } from './services/auth-events.service';
import { GoogleAuthService } from './services/google-auth.service';
import { OtpService } from './services/otp.service';
import { SessionService } from './services/session.service';
import { SmsService } from './services/sms.service';
import { AwsSnsSmsProvider } from './services/sms-providers/aws-sns-sms.provider';
import { ConsoleSmsProvider } from './services/sms-providers/console-sms.provider';
import { FirebaseSmsProvider } from './services/sms-providers/firebase-sms.provider';
import { Msg91SmsProvider } from './services/sms-providers/msg91-sms.provider';
import { TwilioSmsProvider } from './services/sms-providers/twilio-sms.provider';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuthUser.name, schema: AuthUserSchema },
      { name: Otp.name, schema: OtpSchema },
      { name: Session.name, schema: SessionSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m') },
      }),
    }),
    // Producer-only RabbitMQ clients used to publish user.created / user.login
    // events. auth-service never consumes messages, so it stays a plain
    // HTTP app (no hybrid microservice needed) — see AuthEventsService.
    //
    // RMQ's NestJS transport delivers each queue to ONE consumer (competing
    // consumers, not fanout) — so with two independent subscribers
    // (notification-service on auth_events_queue, ecom-service's signup-credit
    // grant on ecom_events_queue) the event must be published to BOTH queues,
    // not just one. Forgetting this queue means ecom-service never sees
    // user.created — which is exactly why signup AI credits stopped granting.
    ClientsModule.registerAsync([
      {
        name: 'EVENTS_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672')],
            queue: configService.get<string>('RABBITMQ_EVENTS_QUEUE', 'auth_events_queue'),
            queueOptions: { durable: true },
          },
        }),
      },
      {
        name: 'ECOM_EVENTS_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672')],
            queue: configService.get<string>('ECOM_EVENTS_QUEUE', 'ecom_events_queue'),
            queueOptions: { durable: true },
          },
        }),
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    SmsService,
    GoogleAuthService,
    SessionService,
    AuthEventsService,
    ConsoleSmsProvider,
    Msg91SmsProvider,
    TwilioSmsProvider,
    AwsSnsSmsProvider,
    FirebaseSmsProvider,
  ],
})
export class AuthModule {}
