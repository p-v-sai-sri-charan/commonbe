import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

export interface AuthEventUser {
  id: string;
  mobileNumber?: string;
  email?: string;
}

/**
 * Publishes domain events (user.created / user.login) to RabbitMQ so other
 * services — notification-service today, more later — can react without
 * auth-service knowing who's listening.
 *
 * Publishing is best-effort: a broker outage must never break login/signup,
 * so failures are logged and swallowed rather than thrown.
 */
@Injectable()
export class AuthEventsService {
  private readonly logger = new Logger(AuthEventsService.name);

  constructor(
    @Inject('EVENTS_SERVICE') private readonly client: ClientProxy,
    // RMQ queues are competing-consumer, not fanout — ecom-service's signup-
    // credit grant needs its own delivery of user.created, hence a second client.
    @Inject('ECOM_EVENTS_SERVICE') private readonly ecomClient: ClientProxy,
  ) {}

  private emit(client: ClientProxy, pattern: string, payload: Record<string, unknown>): void {
    try {
      client.emit(pattern, payload).subscribe({
        error: (err) => this.logger.warn(`Failed to publish "${pattern}" event: ${err?.message ?? err}`),
      });
    } catch (err) {
      this.logger.warn(`Failed to publish "${pattern}" event: ${(err as Error)?.message ?? err}`);
    }
  }

  userCreated(user: AuthEventUser, via: 'mobile' | 'google'): void {
    const payload = { ...user, via, occurredAt: new Date().toISOString() };
    this.emit(this.client, 'user.created', payload);
    this.emit(this.ecomClient, 'user.created', payload);
  }

  userLogin(user: AuthEventUser, via: 'mobile' | 'google'): void {
    this.emit(this.client, 'user.login', { ...user, via, occurredAt: new Date().toISOString() });
  }
}
