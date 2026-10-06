import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiResponseEnvelope } from '@repo/shared-dto';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : null;

    const message =
      typeof exceptionResponse === 'object' && exceptionResponse !== null && 'message' in exceptionResponse
        ? (exceptionResponse as { message: unknown }).message
        : exception instanceof Error
          ? exception.message
          : 'Internal server error';

    const envelope: ApiResponseEnvelope<null> = {
      success: false,
      statusCode: status,
      data: null,
      meta: {
        requestId: (request.headers['x-request-id'] as string) ?? crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
      error: {
        code: `HTTP_${status}`,
        message: Array.isArray(message) ? message.join(', ') : String(message),
      },
    };

    response.status(status).json(envelope);
  }
}
