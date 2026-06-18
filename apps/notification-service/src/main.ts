// Needed because the RabbitMQ connection options below must be read from
// process.env before Nest's DI container (and therefore ConfigModule) exists.
import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  // notification-service is a pure message consumer — no inbound HTTP routes.
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672'],
      queue: process.env.RABBITMQ_EVENTS_QUEUE ?? 'auth_events_queue',
      queueOptions: { durable: true },
    },
  });

  await app.listen();
  console.log('notification-service listening for RabbitMQ events');
}
bootstrap();
