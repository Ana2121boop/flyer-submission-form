// api/admin/login.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';
import bcrypt from 'bcrypt'; // For checking hashed passwords
import jwt from 'jsonwebtoken'; // For creating JWT tokens

// Use the specific environment variable names confirmed from your Vercel settings
const connectionString = process.env.DATABASE_POSTGRES_URL; // ** Using DATABASE_POSTGRES_URL **
const jwtSecret = process.env.JWT_SECRET;

// Database Connection Pool Setup
// Add sslmode=require for Vercel Postgres/Neon
const pool = new Pool({
  connectionString: connectionString ? connectionString + "?sslmode=require" : undefined,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {

  // Check if the necessary environment variables were loaded
  if (!connectionString || !jwtSecret) {
    console.error("Server configuration error: Missing DB URL or JWT Secret.");
    // Log specifically which one might be missing
    if (!connectionString) console.error("DATABASE_POSTGRES_URL is missing or not accessible!");
    if (!jwtSecret) console.error("JWT_SECRET is missing or not accessible!");
    // Return the configuration error
    return res.status(500).json({ message: "Internal Server Error: Configuration issue." });
  }

  // Only allow POST requests for login
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  // --- Handle POST Request ---
  try {
    const { username, password } = req.body;

    // Basic Input Validation
    if (!username || !password) {
      return res.status(400).json({ message: 'Bad Request: Username and password are required.' });
    }

    // Find user in the database (make sure table name and columns match your DB)
    const sqlQuery = 'SELECT id, username, password_hash FROM admin_users WHERE username = $1';
    const values = [username];

    console.log(`Looking up admin user in Vercel Postgres: ${username}`);
    const result = await pool.query(sqlQuery, values);

    // Check if user exists
    if (result.rows.length === 0) {
      console.log(`Login failed: User ${username} not found.`);
      return res.status(401).json({ message: 'Invalid credentials.' }); // 401 Unauthorized
    }

    const adminUser = result.rows[0];
    const storedPasswordHash = adminUser.password_hash;

    // Compare submitted password with stored hash using bcrypt
    console.log(`Comparing password for user: ${username}`);
    const passwordMatches = await bcrypt.compare(password, storedPasswordHash);

    if (!passwordMatches) {
      console.log(`Login failed: Incorrect password for user ${username}.`);
      return res.status(401).json({ message: 'Invalid credentials.' }); // 401 Unauthorized
    }

    // --- Credentials are valid ---
    console.log(`Admin login successful for user: ${username}`);

    // Create JWT Payload (Data to store in the token)
    const tokenPayload = {
      userId: adminUser.id,
      username: adminUser.username,
      role: 'admin', // You can use this role later for authorization checks
    };

    // Sign the JWT using your secret key
    const token = jwt.sign(
        tokenPayload,
        jwtSecret, // Use the secret from environment variables
        { expiresIn: '1h' } // Token will expire in 1 hour (e.g., '1h', '7d', '30m')
    );

    // Send success response including the generated token
    return res.status(200).json({ message: 'Login successful!', token: token });

  } catch (error) {
    // Catch any unexpected errors during the process
    console.error('Error during admin login:', error);
    return res.status(500).json({ message: 'Internal Server Error: Login processing failed.' });
  }
}