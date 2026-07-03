import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
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
    .setTitle('Temptatto Service')
    .setDescription(
      'Custom temporary-tattoo design & storefront platform: categories, products, ' +
        'designs (freehand/shape/image canvas with cm-precise print sizing), marketplace, ' +
        'store storefronts, cart, orders (hybrid physical/digital fulfillment), and admin.',
    )
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  const port = configService.get<number>('TEMPTATTO_SERVICE_PORT', 3007);
  await app.listen(port);
  console.log(`temptatto-service listening on port ${port}`);
  console.log(`Swagger docs at http://localhost:${port}/docs`);
}
bootstrap();
