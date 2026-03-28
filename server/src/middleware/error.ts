import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { message: err.message, statusCode: err.statusCode },
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        message: err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        statusCode: 400,
      },
    });
  }

  // Handle body-parser / JSON syntax errors
  if ('status' in err && (err as any).status === 400) {
    return res.status(400).json({
      error: { message: (err as any).message || 'Bad request', statusCode: 400 },
    });
  }

  logger.error('Unhandled error:', err);

  return res.status(500).json({
    error: { message: 'Internal server error', statusCode: 500 },
  });
}
