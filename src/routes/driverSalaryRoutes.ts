import { Router } from 'express';
import { getDriverSalaryList } from '../controllers/driverSalaryController';

const router = Router();

router.get('/driver/list', getDriverSalaryList);

export default router;
