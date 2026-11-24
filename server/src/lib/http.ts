import type { NextFunction, Request, Response } from "express";

/** An expected failure with an HTTP status. The error handler turns it into JSON. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type AsyncRoute = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/** Express 4 does not catch a rejected async handler on its own. */
export function asyncHandler(fn: AsyncRoute) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export function routeId(value: string | string[] | undefined): string {
  const id = Array.isArray(value) ? value[0] : value;
  if (!id || id.length > 64) {
    throw new HttpError(400, "Invalid id");
  }
  return id;
}
