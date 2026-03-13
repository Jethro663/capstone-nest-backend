import * as winston from 'winston';
import LokiTransport from 'winston-loki';

const isProd = process.env.NODE_ENV === 'production';

const transports: winston.transport[] = [
  // Console transport — always enabled
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, context, stack }) => {
        const ctx = context ? `[${context}]` : '';
        const err = stack ? `\n${stack}` : '';
        return `${timestamp} ${level} ${ctx} ${message}${err}`;
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

// Add Loki transport in production
if (isProd && process.env.LOKI_HOST) {
  transports.push(
    new LokiTransport({
      host: process.env.LOKI_HOST || 'http://localhost:3100',
      labels: {
        app: 'nexora-lms-backend',
        environment: process.env.NODE_ENV || 'development',
      },
    }),
  );
}

export const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  transports,
  exitOnError: false,
});
