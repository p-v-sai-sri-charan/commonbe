import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationChannel, NotificationLog, NotificationLogDocument } from './schemas/notification-log.schema';

export interface UserEventPayload {
  id: string;
  mobileNumber?: string;
  email?: string;
  via: 'mobile' | 'google';
  occurredAt: string;
}

/**
 * Placeholder dispatch logic for outbound notifications. Swap the bodies
 * below for real email (SES/SendGrid), push (FCM/APNs) integrations later
 * — the event handlers in notifications.controller.ts won't need to change.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(NotificationLog.name) private readonly notificationLogModel: Model<NotificationLogDocument>,
  ) {}

  private async log(event: string, payload: UserEventPayload, channel: NotificationChannel) {
    await this.notificationLogModel.create({ authUserId: payload.id, event, channel, payload });
  }

  async handleUserCreated(payload: UserEventPayload): Promise<void> {
    // TODO: send a real welcome email/push via SES/SendGrid/FCM.
    this.logger.log(`[notification placeholder] Welcome notification for user ${payload.id} (via ${payload.via})`);
    await this.log('user.created', payload, NotificationChannel.EMAIL);
  }

  async handleUserLogin(payload: UserEventPayload): Promise<void> {
    // TODO: send a real "new login" security alert via push/SMS if desired.
    this.logger.log(`[notification placeholder] Login alert for user ${payload.id} (via ${payload.via})`);
    await this.log('user.login', payload, NotificationChannel.PUSH);
  }
}
