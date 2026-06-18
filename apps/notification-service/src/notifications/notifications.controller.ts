import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationsService, UserEventPayload } from './notifications.service';

/**
 * Message handlers for events published on RabbitMQ by auth-service (and,
 * later, other services). This is a microservice controller, not an HTTP
 * one — notification-service has no inbound HTTP routes.
 */
@Controller()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @EventPattern('user.created')
  async onUserCreated(@Payload() payload: UserEventPayload) {
    await this.notificationsService.handleUserCreated(payload);
  }

  @EventPattern('user.login')
  async onUserLogin(@Payload() payload: UserEventPayload) {
    await this.notificationsService.handleUserLogin(payload);
  }
}
