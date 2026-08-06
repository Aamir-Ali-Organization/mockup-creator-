export class AppError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(message: string, statusCode = 400, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function toErrorResponse(error: unknown) {
  if (error instanceof AppError) {
    return Response.json(
      { success: false, message: error.message, details: error.details },
      { status: error.statusCode },
    );
  }

  const message = error instanceof Error ? error.message : 'Internal server error';
  return Response.json({ success: false, message }, { status: 500 });
}
