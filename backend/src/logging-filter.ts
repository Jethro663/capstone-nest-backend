import { Catch, ArgumentsHost, HttpException, ExceptionFilter, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

@Catch(HttpException)
export class LoggingExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(LoggingExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const status = exception.getStatus();

    if (status === 400) {
      const log = {
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        body: request.body,
        response: exception.getResponse(),
      };
      try {
        const logPath = path.join(os.tmpdir(), 'nexora-error_400.log');
        fs.appendFileSync(logPath, JSON.stringify(log) + '\n');
      } catch {
        this.logger.warn(
          `[400] ${request.method} ${request.url} — ${JSON.stringify(exception.getResponse())}`,
        );
      }
    }

    response.status(status).json(exception.getResponse());
  }
}
