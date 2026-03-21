import './tracing';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';
import { MetricsInterceptor } from './monitoring/utils/metrics.interceptor';
import { winstonLogger } from './common/logger/winston.config';
import { WinstonLoggerService } from './common/logger/winston-logger.service';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

function parseOriginList(value?: string): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeOrigin(origin: string): string | null {
  try {
    return new URL(origin).origin;
  } catch {
    return null;
  }
}

function buildAllowedOrigins(isProd: boolean): string[] {
  const configuredOrigins = [
    process.env.FRONTEND_URL,
    process.env.NEXT_FRONTEND_URL,
    process.env.MOBILE_URL,
    ...parseOriginList(process.env.CORS_ALLOWED_ORIGINS),
  ]
    .map((origin) => normalizeOrigin(origin ?? ''))
    .filter((origin): origin is string => !!origin);

  const devOrigins = !isProd
    ? [
        'http://localhost:5173',
        'http://localhost:8081',
        'http://localhost:3001',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:8081',
        'http://127.0.0.1:3001',
      ]
    : [];

  return Array.from(new Set([...configuredOrigins, ...devOrigins]));
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Register Winston as the global logger
  app.useLogger(new WinstonLoggerService(winstonLogger));

  // Graceful shutdown — lets in-flight requests finish before the process exits
  app.enableShutdownHooks();

  // Use Socket.io adapter for WebSocket support (notifications gateway)
  app.useWebSocketAdapter(new IoAdapter(app));

  const isProd = process.env.NODE_ENV === 'production';
  const trustProxyHops = parseInt(
    process.env.TRUST_PROXY_HOPS ?? (isProd ? '1' : '0'),
    10,
  );

  if (trustProxyHops > 0) {
    (app as any).set('trust proxy', trustProxyHops);
  }

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

  // Global metrics interceptor
  app.useGlobalInterceptors(new MetricsInterceptor());

  // Swagger — only exposed outside production to avoid leaking API shapes
  if (!isProd) {
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
    const documentFactory = () =>
      SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api', app, documentFactory);
    logger.log('Swagger UI available at http://localhost:3000/api');
  }

  // Cookie parser
  app.use(cookieParser());

  // CORS - allow configured origins; localhost only outside production
  const allowedOrigins = buildAllowedOrigins(isProd);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalized = normalizeOrigin(origin);
      if (normalized && allowedOrigins.includes(normalized)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  await app.listen(3000, '0.0.0.0');
  logger.log(
    `Application running on http://localhost:3000 [${isProd ? 'production' : 'development'}]`,
  );
  logger.log(`CORS allowlist: ${allowedOrigins.join(', ') || '[none configured]'}`);
}

bootstrap();
