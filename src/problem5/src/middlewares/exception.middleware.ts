import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/app-error";

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const status = typeof err.statusCode == "number" ? err.statusCode : 500;

  console.error(err);

  if(status !== 500) {
    res.status(status).json({
      status: "error",
      message: err.message,
    });
  }

  res.status(status).json({
    status: "error",
    message: "Internal server error",
  });
};
