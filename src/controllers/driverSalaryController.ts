import { Request, Response, NextFunction } from 'express';
import { getDriverSalary } from '../services/driverSalaryService';

export const getDriverSalaryList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const month = parseInt(req.query.month as string, 10);
    const year = parseInt(req.query.year as string, 10);
    const page_size = parseInt(req.query.page_size as string, 10) || 10;
    const current = parseInt(req.query.current as string, 10) || 1;
    const driver_code = req.query.driver_code as string | undefined;
    const status = req.query.status as string | undefined;
    const name = req.query.name as string | undefined;

   if (isNaN(month) || month < 1 || month > 12) {
    return res.status(400).json({ message: 'Invalid month. It must be a number between 1 and 12.' });
  }
  const currentYear = new Date().getFullYear();
  if (isNaN(year) || year < 1900 || year > currentYear) {
    return res.status(400).json({ message: `Invalid year. It must be a number between 1900 and ${currentYear}.` });
  }

    const salaryData = await getDriverSalary({ month, year, page_size, current, driver_code, status, name });
    res.json({
      status: true,
      message: 'Success get driver salary list',
      salaryData});
  } catch (error) {
    next(error)
  }
};
