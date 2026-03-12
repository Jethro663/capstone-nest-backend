import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap, catchError } from 'rxjs/operators'
import { httpRequestDuration, httpRequestTotal, httpRequestErrors } from './metrics'

@Injectable()
export class MetricsInterceptor implements NestInterceptor {

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest()
    const response = context.switchToHttp().getResponse()

    const method = request.method
    const route = request.route?.path || request.url
    const start = Date.now()

    return next.handle().pipe(
      tap(() => {
        const duration = (Date.now() - start) / 1000
        const statusCode = response.statusCode

        // Record duration histogram
        httpRequestDuration
          .labels(method, route, statusCode)
          .observe(duration)

        // Increment request counter
        httpRequestTotal
          .labels(method, route, statusCode)
          .inc()
      }),
      catchError((error) => {
        const duration = (Date.now() - start) / 1000
        const errorType = error.constructor.name

        // Record error metrics
        httpRequestErrors
          .labels(method, route, errorType)
          .inc()

        // Record duration even on error
        httpRequestDuration
          .labels(method, route, response.statusCode || 500)
          .observe(duration)

        throw error
      })
    )
  }
}