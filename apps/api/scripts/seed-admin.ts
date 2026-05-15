import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { getDb, adminUsers } from '@flyer/db';

const username = process.env.ADMIN_USERNAME;
const password = process.env.ADMIN_PASSWORD;

if (!username || !password) {
  console.error('Set ADMIN_USERNAME and ADMIN_PASSWORD env vars first.');
  process.exit(1);
}
if (password.length < 10) {
  console.error('ADMIN_PASSWORD must be at least 10 characters.');
  process.exit(1);
}

const db = getDb();
const hash = await bcrypt.hash(password, 12);

const [existing] = await db.select().from(adminUsers).where(eq(adminUsers.username, username)).limit(1);
if (existing) {
  await db.update(adminUsers).set({ passwordHash: hash }).where(eq(adminUsers.id, existing.id));
  console.log(`Updated password for existing admin: ${username}`);
} else {
  await db.insert(adminUsers).values({ username, passwordHash: hash });
  console.log(`Created admin: ${username}`);
}

process.exit(0);
