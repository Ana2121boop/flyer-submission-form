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

  // --- Authentication Check (Moved up to protect all methods for this route) ---
  let adminUserPayload: { userId: number; username: string; role: string };
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: Missing or invalid token format.' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, jwtSecret) as jwt.JwtPayload; // Use JwtPayload for better typing

    if (decoded.role !== 'admin') {
      console.log(`Forbidden attempt on /api/admin/submission/[id]: User role is not 'admin'. User: ${decoded.username}`);
      return res.status(403).json({ message: 'Forbidden: Admin access required.' });
    }
    adminUserPayload = decoded as { userId: number; username: string; role: string }; // Cast after role check
    console.log(`Admin user ${adminUserPayload.username} accessing /api/admin/submission/[id] with method ${req.method}`);

  } catch (error: any) {
    console.error('JWT Verification failed in /api/admin/submission/[id]:', error.message);
    return res.status(401).json({ message: `Unauthorized: ${error.message}` });
  }

  // --- Get and Validate Submission ID (common for GET and DELETE) ---
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Bad Request: Missing or invalid submission ID.' });
  }

  const submissionId = parseInt(id, 10);
  if (isNaN(submissionId)) {
    return res.status(400).json({ message: 'Bad Request: Submission ID must be a number.' });
  }

  // --- Handle GET Request ---
  if (req.method === 'GET') {
    try {
      console.log(`Workspaceing submission with ID: ${submissionId} for admin: ${adminUserPayload.username}`);
      const sqlQuery = 'SELECT id, form_data, submitted_at FROM submissions WHERE id = $1';
      const result = await pool.query(sqlQuery, [submissionId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: `Submission with ID ${submissionId} not found.` });
      }
      return res.status(200).json(result.rows[0]);

    } catch (error) {
      console.error(`Error fetching single submission (ID: ${submissionId}) from DB:`, error);
      return res.status(500).json({ message: 'Internal Server Error: Could not retrieve submission.' });
    }
  }
  // --- NEW: Handle DELETE Request ---
  else if (req.method === 'DELETE') {
    try {
      console.log(`Attempting to delete submission with ID: ${submissionId} by admin: ${adminUserPayload.username}`);
      
      const deleteQuery = "DELETE FROM submissions WHERE id = $1";
      const result = await pool.query(deleteQuery, [submissionId]);

      if (result.rowCount === 0) {
        // No rows were deleted, meaning the ID was not found
        return res.status(404).json({ message: `Submission with ID ${submissionId} not found.` });
      }

      console.log(`Submission ${submissionId} deleted successfully by admin: ${adminUserPayload.username}`);
      // Return 200 with a message or 204 No Content
      return res.status(200).json({ message: `Submission ${submissionId} deleted successfully.` });
      // Alternatively, for 204 No Content:
      // return res.status(204).end();

    } catch (error) {
      console.error(`Error deleting submission (ID: ${submissionId}) from DB:`, error);
      return res.status(500).json({ message: 'Internal Server Error: Could not delete submission.' });
    }
  }
  // --- End of DELETE Request Handler ---
  else {
    // If method is not GET or DELETE
    res.setHeader('Allow', ['GET', 'DELETE']); // <<< MODIFIED: Include DELETE
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }
}