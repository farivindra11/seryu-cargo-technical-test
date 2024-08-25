import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    status: false,
    message: err.message || 'Internal Server Error',
  });
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
    res.status(404).json({
      status: false,
      message: 'URL Not Found!',
    });
  };
