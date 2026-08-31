import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred';
    let data: unknown;
    const publicDetails: Record<string, unknown> = {};

    // Handle multer file-size limit errors
    if (
      exception instanceof Error &&
      (exception as NodeJS.ErrnoException).code === 'LIMIT_FILE_SIZE'
    ) {
      return response.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
        success: false,
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        message: 'File exceeds the 100 MB maximum upload limit',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }

    if (
      exception instanceof Error &&
      (exception as { type?: string }).type === 'entity.too.large'
    ) {
      return response.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
        success: false,
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        message: 'Request payload is too large',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const body = exceptionResponse as Record<string, unknown>;
        message = (body.message as string) ?? message;
        data = body.data;
        if (typeof body.code === 'string') publicDetails.code = body.code;
        if (Array.isArray(body.errors))
          publicDetails.errors = body.errors.filter(
            (value) => typeof value === 'string',
          );
        if (Array.isArray(body.fieldErrors))
          publicDetails.fieldErrors = body.fieldErrors
            .filter(
              (value) =>
                value &&
                typeof value.field === 'string' &&
                typeof value.message === 'string',
            )
            .map(({ field, message }) => ({ field, message }));
      }
    } else {
      // Unexpected errors — log full stack internally, return generic message
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message: Array.isArray(message) ? message : message,
      ...(data !== undefined ? { data } : {}),
      ...publicDetails,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
