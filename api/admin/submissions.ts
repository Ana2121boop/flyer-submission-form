// api/admin/submissions.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken'; // Tool for verifying JWT tokens

// Use the specific environment variable names confirmed from your Vercel settings
const connectionString = process.env.DATABASE_POSTGRES_URL; // ** Using DATABASE_POSTGRES_URL **
const jwtSecret = process.env.JWT_SECRET;

// Database Connection Pool Setup
// Add sslmode=require for Vercel Postgres/Neon
const pool = new Pool({
  connectionString: connectionString ? connectionString + "?sslmode=require" : undefined,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {

  // Check if the necessary environment variables were loaded first
  if (!connectionString || !jwtSecret) {
    console.error("Server configuration error: Missing DB URL or JWT Secret in /api/admin/submissions");
    if (!connectionString) console.error("DATABASE_POSTGRES_URL is missing!");
    if (!jwtSecret) console.error("JWT_SECRET is missing!");
    return res.status(500).json({ message: "Internal Server Error: Configuration issue." });
  }

  // Only allow GET requests for fetching data
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  // --- Handle GET Request ---

  // 1. Authentication Check: Verify the JWT token
  let adminUserPayload: { userId: number; username: string; role: string };
  try {
    const authHeader = req.headers.authorization; // Expect "Authorization: Bearer <token>"
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: Missing or invalid token format.' });
    }
    const token = authHeader.split(' ')[1];

    console.log('Verifying token for submissions list access...');
    const decoded = jwt.verify(token, jwtSecret);

    if ((decoded as any).role !== 'admin') {
      console.log(`Forbidden attempt on submissions list: User role is not 'admin'.`);
      return res.status(403).json({ message: 'Forbidden: Admin access required.' });
    }

    adminUserPayload = decoded as { userId: number; username: string; role: string };
    console.log(`Submissions list access granted for admin user: ${adminUserPayload.username}`);

  } catch (error: any) {
    console.error('JWT Verification failed in /api/admin/submissions:', error.message);
    return res.status(401).json({ message: `Unauthorized: ${error.message}` });
  }

  // --- Fetch **Summarized** Data from Database ---
  try {
    console.log(`Workspaceing submissions summary for admin user: ${adminUserPayload.username}`);

    // ** OPTIMIZED SQL QUERY **
    // Select only ID, timestamp, and specific fields extracted from form_data JSONB
    // The ->> operator extracts a JSON field as text. We use AS to rename the extracted fields.
    // jsonb_array_length gets the number of elements in the products array.
    const sqlQuery = `
        SELECT
            id,
            submitted_at,
            form_data ->> 'storeName' AS store_name,
            form_data ->> 'submittedBy' AS submitted_by,
            jsonb_array_length(form_data -> 'products') AS product_count
        FROM submissions
        ORDER BY submitted_at DESC;
    `;

    const result = await pool.query(sqlQuery);

    console.log(`Retrieved ${result.rows.length} submission summaries.`);

    // Return the summarized submission data (array of objects)
    return res.status(200).json(result.rows);

  } catch (error) {
    // Catch Block for database query errors
    console.error('Error fetching submission summaries from Vercel Postgres:', error);
    return res.status(500).json({ message: 'Internal Server Error: Could not retrieve submissions.' });
  }
}