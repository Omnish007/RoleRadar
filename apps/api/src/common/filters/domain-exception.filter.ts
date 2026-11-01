import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { ZodError } from "zod";

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return response.status(status).json({ statusCode: status, message: exception.message });
    }
    if (exception instanceof ZodError) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: "Request validation failed",
        issues: exception.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }))
      });
    }
    if (typeof exception === "object" && exception !== null && "code" in exception && exception.code === 11000) {
      return response.status(HttpStatus.CONFLICT).json({ statusCode: HttpStatus.CONFLICT, message: "A duplicate record already exists." });
    }
    const message = exception instanceof Error ? exception.message : "Unexpected server error";
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ statusCode: 500, message: "Unexpected server error", detail: process.env.NODE_ENV === "development" ? message : undefined });
  }
}
