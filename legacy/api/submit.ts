// api/submit.ts

// Imports: Bring in necessary tools
import type { VercelRequest, VercelResponse } from '@vercel/node'; // Ensure @vercel/node is installed
import { Pool } from 'pg'; // Tool to talk to PostgreSQL

// Get the connection string provided automatically by Vercel's Postgres integration
// Using the variable name confirmed from your Vercel settings
const connectionStringFromEnv = process.env.DATABASE_POSTGRES_URL;

// Database Connection Pool Setup
const pool = new Pool({
  // Use the Vercel-provided variable and append ?sslmode=require for Neon/Vercel PG
  connectionString: connectionStringFromEnv ? connectionStringFromEnv + "?sslmode=require" : undefined,
});

// Handler Function: Runs when Vercel receives a request for /api/submit
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Check if the database connection string is available first
  if (!connectionStringFromEnv) {
      console.error("FATAL: DATABASE_POSTGRES_URL environment variable is not set or not accessible!");
      return res.status(500).json({ message: "Internal Server Error: Database configuration issue." });
  }

  // Method Check: Only allow POST requests for submitting data
  if (req.method !== 'POST') {
    console.log(`Method ${req.method} not allowed for /api/submit`);
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  // --- If we are here, it IS a POST request ---

  // Input Validation (Basic): Check if request body has data
  const formData = req.body;
  if (!formData || typeof formData !== 'object' || Object.keys(formData).length === 0) {
    console.log('Submit attempt with invalid/empty body:', formData);
    return res.status(400).json({ message: 'Bad Request: No valid form data received.' });
  }

  // Error Handling (try/catch) for database operation
  try {
    // Database Interaction (INSERT): Save the form data
    console.log('Attempting to insert form data into Vercel Postgres (Neon):', formData);

    // Use parameterized query ($1) for security.
    // Assumes 'submissions' table with 'form_data' column (JSONB type recommended).
    const sqlQuery = 'INSERT INTO submissions(form_data) VALUES($1) RETURNING id';
    const values = [formData]; // The data to insert

    // Execute the query using the connection pool
    const result = await pool.query(sqlQuery, values);

    // Get the ID of the row that was just created in the database.
    const insertedId = result.rows[0]?.id;
    console.log(`Successfully inserted submission with ID: ${insertedId} into Vercel Postgres`);

    // Send a success (201 Created) response back to the frontend.
    return res.status(201).json({ message: 'Submission successful!', submissionId: insertedId });

  } catch (error) {
    // Catch Block: Runs if pool.query failed.
    console.error('Error saving submission to Vercel Postgres:', error); // Log the specific error

    // Send a generic server error response back to the frontend.
    return res.status(500).json({ message: 'Internal Server Error: Could not save submission.' });
  }
}