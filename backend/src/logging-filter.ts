import { Catch, ArgumentsHost, HttpException, ExceptionFilter } from '@nestjs/common';
import * as fs from 'fs';

@Catch(HttpException)
export class LoggingExceptionFilter implements ExceptionFilter {
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
      fs.appendFileSync('c:/Users/Marc/OneDrive/AppData/Desktop/Capstone 2/capstone-nest-backend/backend/error_400.log', JSON.stringify(log) + '\n');
    }
    
    response.status(status).json(exception.getResponse());
  }
}
