// api/admin/submission/[id].ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

// Use the correct environment variable name
const connectionString = process.env.DATABASE_POSTGRES_URL;
const jwtSecret = process.env.JWT_SECRET;

// Database Connection Pool
const pool = new Pool({
  connectionString: connectionString ? connectionString + "?sslmode=require" : undefined,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Check configuration
  if (!connectionString || !jwtSecret) {
    console.error("Config Error: Missing DB URL or JWT Secret in /api/admin/submission/[id]");
    return res.status(500).json({ message: "Internal Server Error: Configuration issue." });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  // --- Authentication Check ---
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: Missing or invalid token format.' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, jwtSecret);

    if ((decoded as any).role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin access required.' });
    }
    // Authentication successful
    console.log(`Admin user ${(decoded as any).username} requesting single submission.`);

  } catch (error: any) {
    console.error('JWT Verification failed in /api/admin/submission/[id]:', error.message);
    return res.status(401).json({ message: `Unauthorized: ${error.message}` });
  }

  // --- Fetch Single Submission ---
  try {
    // Get the ID from the dynamic route parameter
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
       return res.status(400).json({ message: 'Bad Request: Missing or invalid submission ID.' });
    }

    // Validate if ID is a number (or bigserial)
    const submissionId = parseInt(id, 10);
    if (isNaN(submissionId)) {
        return res.status(400).json({ message: 'Bad Request: Submission ID must be a number.'});
    }

    console.log(`Workspaceing submission with ID: ${submissionId}`);
    // Query for the specific submission
    const sqlQuery = 'SELECT id, form_data, submitted_at FROM submissions WHERE id = $1';
    const result = await pool.query(sqlQuery, [submissionId]);

    // Check if a submission was found
    if (result.rows.length === 0) {
      return res.status(404).json({ message: `Submission with ID ${submissionId} not found.` });
    }

    // Return the single submission data
    return res.status(200).json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching single submission from DB:', error);
    return res.status(500).json({ message: 'Internal Server Error: Could not retrieve submission.' });
  }
}