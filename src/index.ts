import express from 'express';
import salaryRoutes from './routes/driverSalaryRoutes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use('/api/v1/salary', salaryRoutes);
app.use('*', notFoundHandler)
app.use('*', errorHandler)

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});