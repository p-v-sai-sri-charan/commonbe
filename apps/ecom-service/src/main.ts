import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Ecom Service')
    .setDescription(
      'T-shirt e-commerce with AI-powered design studio: products, designs, creator marketplace, ' +
        'AI image generation (DALL-E, BYOK), shopping cart, orders, and AI design credits.',
    )
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  app.setGlobalPrefix('ecom');

  const rabbitmqUrl = configService.get<string>('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672');
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl],
      queue: 'ecom_events_queue',
      queueOptions: { durable: true },
      noAck: false,
    },
  });
  await app.startAllMicroservices();

  const port = configService.get<number>('ECOM_SERVICE_PORT', 3006);
  await app.listen(port);
  console.log(`ecom-service listening on port ${port}`);
  console.log(`Swagger docs at http://localhost:${port}/docs`);
}
bootstrap();
