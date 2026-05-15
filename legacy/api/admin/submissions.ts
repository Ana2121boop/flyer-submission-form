// api/admin/submissions.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

const connectionString = process.env.DATABASE_POSTGRES_URL;
const jwtSecret = process.env.JWT_SECRET;

const pool = new Pool({
  connectionString: connectionString ? connectionString + "?sslmode=require" : undefined,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!connectionString || !jwtSecret) {
    console.error("Server configuration error: Missing DB URL or JWT Secret in /api/admin/submissions");
    return res.status(500).json({ message: "Internal Server Error: Configuration issue." });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  let adminUserPayload: { userId: number; username: string; role: string };
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: Missing or invalid token format.' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, jwtSecret) as jwt.JwtPayload;

    if (decoded.role !== 'admin') {
      console.log(`Forbidden attempt on submissions list: User role is not 'admin'. User: ${decoded.username}`);
      return res.status(403).json({ message: 'Forbidden: Admin access required.' });
    }
    adminUserPayload = decoded as { userId: number; username: string; role: string };
    console.log(`Submissions list access granted for admin user: ${adminUserPayload.username}`);
  } catch (error: any) {
    console.error('JWT Verification failed in /api/admin/submissions:', error.message);
    return res.status(401).json({ message: `Unauthorized: ${error.message}` });
  }

  try {
    // === NEW: Read filter parameters from query string ===
    const {
        dateStart,       // Expected format: YYYY-MM-DD
        dateEnd,         // Expected format: YYYY-MM-DD
        storeName        // Text string
    } = req.query;

    console.log(`Workspaceing submissions summary for admin user: ${adminUserPayload.username}`);
    console.log('Applied filters:', { dateStart, dateEnd, storeName });

    // === NEW: Dynamically build SQL query ===
    let baseQuery = `
        SELECT
            id,
            submitted_at,
            form_data ->> 'storeName' AS store_name,
            form_data ->> 'submittedBy' AS submitted_by,
            form_data ->> 'flyerValidStartDate' AS flyer_start_date,
            jsonb_array_length(form_data -> 'products') AS product_count
        FROM submissions
    `;

    const conditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Filter by submission date start
    if (dateStart && typeof dateStart === 'string') {
        conditions.push(`submitted_at >= $${paramIndex++}`);
        queryParams.push(dateStart);
    }

    // Filter by submission date end
    if (dateEnd && typeof dateEnd === 'string') {
        // To make dateEnd inclusive for the whole day, you might adjust this in SQL
        // or ensure the front-end sends the end of the day.
        // For simplicity, this example uses direct comparison.
        // If submitted_at is a timestamp, you might need to cast dateEnd or submitted_at to date for proper comparison.
        // e.g., conditions.push(`DATE(submitted_at) <= $${paramIndex++}`);
        conditions.push(`submitted_at <= $${paramIndex++}`); // Adjust if submitted_at is timestamp vs date
        queryParams.push(dateEnd); // You might need to append 'T23:59:59.999Z' if it's a full timestamp filter
    }

    // Filter by store name (case-insensitive partial match)
    if (storeName && typeof storeName === 'string') {
        conditions.push(`(form_data ->> 'storeName') ILIKE $${paramIndex++}`);
        queryParams.push(`%${storeName}%`); // Add wildcards for partial matching
    }

    // Add WHERE clause if there are any conditions
    if (conditions.length > 0) {
        baseQuery += " WHERE " + conditions.join(" AND ");
    }

    baseQuery += " ORDER BY submitted_at DESC;";
    const sqlQuery = baseQuery;
    // --- End of dynamic query building ---

    console.log("Executing SQL:", sqlQuery);
    console.log("With parameters:", queryParams);

    const result = await pool.query(sqlQuery, queryParams); // Pass queryParams here

    console.log(`Retrieved ${result.rows.length} submission summaries with filters.`);
    return res.status(200).json(result.rows);

  } catch (error) {
    console.error('Error fetching submission summaries from Vercel Postgres:', error);
    return res.status(500).json({ message: 'Internal Server Error: Could not retrieve submissions.' });
  }
}