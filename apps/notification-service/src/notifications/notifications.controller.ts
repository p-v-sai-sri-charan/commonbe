import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationsService, OrderPaidPayload, UserEventPayload } from './notifications.service';

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

  @EventPattern('temptatto.order.paid')
  async onOrderPaid(@Payload() payload: OrderPaidPayload) {
    await this.notificationsService.handleOrderPaid(payload);
  }
}
