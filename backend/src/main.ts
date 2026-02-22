import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Graceful shutdown — lets in-flight requests finish before the process exits
  app.enableShutdownHooks();

  const isProd = process.env.NODE_ENV === 'production';

  // Validate required env vars before accepting traffic
  if (isProd && !process.env.FRONTEND_URL) {
    logger.error('FRONTEND_URL must be set in production. Aborting startup.');
    process.exit(1);
  }

  // Helmet — strict in production; disable CSP in development so Swagger UI
  // can load its inline scripts and CDN assets without being blocked.
  app.use(isProd ? helmet() : helmet({ contentSecurityPolicy: false }));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger — only exposed outside production to avoid leaking API shapes
  if (isProd) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Nexora LMS + LXP API')
      .setDescription('LMS + LXP API documentation')
      .setVersion('1.0')
      .addTag('LMS')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'token',
      )
      .build();
    const documentFactory = () => SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api', app, documentFactory);
    logger.log('Swagger UI available at http://localhost:3000/api');
  }

  // Cookie parser
  app.use(cookieParser());

  // CORS — allow configured origins; localhost only outside production
  const devOrigins = !isProd
    ? ['http://localhost:5173', 'http://localhost:8081']
    : [];

  app.enableCors({
    origin: [
      process.env.FRONTEND_URL,
      process.env.NEXT_FRONTEND_URL,
      process.env.MOBILE_URL,
      ...devOrigins,
    ].filter(Boolean),
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  await app.listen(3000, '0.0.0.0');
  logger.log(`Application running on http://localhost:3000 [${isProd ? 'production' : 'development'}]`);
}

bootstrap();
