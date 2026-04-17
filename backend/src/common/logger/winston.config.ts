import * as winston from 'winston';
import LokiTransport from 'winston-loki';

const serviceName = process.env.OTEL_SERVICE_NAME || 'nexora-backend';

const transports: winston.transport[] = [
  // Console transport — always enabled
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.colorize(),
      winston.format.printf(
        ({ timestamp, level, message, context, trace, stack }) => {
        const ctx = context ? `[${context}]` : '';
        const traceText = trace ? `\n${trace}` : '';
        const err = stack ? `\n${stack}` : '';
        return `${timestamp} ${level} ${ctx} ${message}${traceText}${err}`;
      }),
    ),
  }),

  // File transport — all logs
  new winston.transports.File({
    filename: 'logs/app.log',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
  }),

  // Error file transport — errors only
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
  }),
];

// Add Loki transport whenever the host is configured.
if (process.env.LOKI_HOST) {
  transports.push(
    new LokiTransport({
      host: process.env.LOKI_HOST,
      labels: {
        app: serviceName,
        service_name: serviceName,
        environment: process.env.NODE_ENV || 'development',
      },
    }),
  );
}

export const winstonLogger = winston.createLogger({
  level:
    process.env.LOG_LEVEL ||
    (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  transports,
  exitOnError: false,
});
