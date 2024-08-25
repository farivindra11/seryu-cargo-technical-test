import pool from '../config/database';

interface SalaryParams {
  month: number;
  year: number;
  page_size?: number;
  current?: number;
  driver_code?: string;
  status?: string;
  name?: string;
}

export const getDriverSalary = async (params: SalaryParams) => {
  const { month, year, page_size = 10, current = 1, driver_code, status, name } = params;
  const offset = Math.max((current - 1) * page_size, 0);

  let baseQuery = `
    WITH shipment_totals AS (
      SELECT 
        d.driver_code,
        d.name,
        COALESCE(SUM(CASE WHEN sc.cost_status = 'PENDING' AND s.shipment_status != 'CANCELLED' THEN sc.total_costs ELSE 0 END), 0) AS total_pending,
        COALESCE(SUM(CASE WHEN sc.cost_status = 'CONFIRMED' AND s.shipment_status != 'CANCELLED' THEN sc.total_costs ELSE 0 END), 0) AS total_confirmed,
        COALESCE(SUM(CASE WHEN sc.cost_status = 'PAID' AND s.shipment_status != 'CANCELLED' THEN sc.total_costs ELSE 0 END), 0) AS total_paid
      FROM drivers d
      LEFT JOIN shipment_costs sc 
        ON d.driver_code = sc.driver_code
      LEFT JOIN shipments s 
        ON sc.shipment_no = s.shipment_no
      WHERE 
        EXTRACT(MONTH FROM s.shipment_date) = $1
        AND EXTRACT(YEAR FROM s.shipment_date) = $2
      GROUP BY d.driver_code, d.name
    ),
    attendance_totals AS (
      SELECT 
        d.driver_code,
        COALESCE(COUNT(da.id) * vc.value, 0) AS total_attendance_salary
      FROM drivers d
      LEFT JOIN driver_attendances da
        ON d.driver_code = da.driver_code
        AND EXTRACT(MONTH FROM da.attendance_date) = $1
        AND EXTRACT(YEAR FROM da.attendance_date) = $2
        AND da.attendance_status = TRUE
      CROSS JOIN (
        SELECT value 
        FROM variable_configs 
        WHERE key = 'DRIVER_MONTHLY_ATTENDANCE_SALARY'
        LIMIT 1
      ) vc
      GROUP BY d.driver_code, vc.value
    ),
    shipment_count AS (
      SELECT 
        d.driver_code,
        COUNT(DISTINCT s.shipment_no) AS count_shipment
      FROM drivers d
      LEFT JOIN shipment_costs sc 
        ON d.driver_code = sc.driver_code
      LEFT JOIN shipments s 
        ON sc.shipment_no = s.shipment_no
      WHERE 
        s.shipment_status != 'CANCELLED'
        AND EXTRACT(MONTH FROM s.shipment_date) = $1
        AND EXTRACT(YEAR FROM s.shipment_date) = $2
      GROUP BY d.driver_code
    )
    SELECT 
      st.driver_code,
      st.name,
      st.total_pending,
      st.total_confirmed,
      st.total_paid,
      at.total_attendance_salary,
      (st.total_pending + st.total_confirmed + st.total_paid + at.total_attendance_salary) AS total_salary,
      sc.count_shipment
    FROM shipment_totals st
    LEFT JOIN attendance_totals at
      ON st.driver_code = at.driver_code
    LEFT JOIN shipment_count sc
      ON st.driver_code = sc.driver_code
    WHERE 
      (st.total_pending + st.total_confirmed + st.total_paid + at.total_attendance_salary) > 0
  `;

  // Add filters
  const queryParams: any[] = [month, year];
  
  if (driver_code) {
    baseQuery += ` AND st.driver_code = $${queryParams.length + 1}`;
    queryParams.push(driver_code);
  }

  if (status) {
    switch (status.toUpperCase()) {
      case 'PENDING':
        baseQuery += ' AND st.total_pending > 0';
        break;
      case 'CONFIRMED':
        baseQuery += ' AND st.total_confirmed > 0';
        break;
      case 'PAID':
        baseQuery += ' AND st.total_paid > 0 AND st.total_confirmed = 0 AND st.total_pending = 0';
        break;
    }
  }

  if (name) {
    baseQuery += ` AND st.name = $${queryParams.length + 1}`;
    queryParams.push(name);
}

  // pagination
  const paginatedQuery = `
    ${baseQuery}
    ORDER BY st.driver_code
    LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
  `;

  // Total count query without pagination
  const countQuery = `
    SELECT COUNT(*) FROM (${baseQuery}) AS total_count_query
  `;

  queryParams.push(page_size, offset);

    // count query
    const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
    const total_row = parseInt(countResult.rows[0].count, 10);

    // paginated query
    const result = await pool.query(paginatedQuery, queryParams);

    const data = result.rows.map(row => ({
      ...row,
      total_pending: parseFloat(row.total_pending),
      total_confirmed: parseFloat(row.total_confirmed),
      total_paid: parseFloat(row.total_paid),
      total_attendance_salary: parseFloat(row.total_attendance_salary),
      total_salary: parseFloat(row.total_salary),
      count_shipment: parseInt(row.count_shipment, 10),
    }));

    return {
      data,
      total_row,
      current,
      page_size,
    };
};
