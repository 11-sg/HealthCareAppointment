import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error(`[Error] ${req.method} ${req.url}:`, err);

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation Error',
      details: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  if (err.status && typeof err.status === 'number') {
    res.status(err.status).json({
      error: err.message || 'An error occurred',
    });
    return;
  }

  res.status(500).json({
    error: err.message || 'Internal Server Error',
  });
}
