import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { getDb, adminUsers } from '@flyer/db';
import { loginSchema } from '@flyer/shared';

export async function loginRoutes(app: FastifyInstance) {
  app.post('/api/admin/login', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Bad Request', issues: parsed.error.issues });
    }
    const { username, password } = parsed.data;

    const db = getDb();
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.username, username)).limit(1);
    if (!user) {
      return reply.code(401).send({ message: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return reply.code(401).send({ message: 'Invalid credentials' });
    }

    const token = await reply.jwtSign({
      userId: user.id,
      username: user.username,
      role: 'admin',
    });

    return reply.send({ message: 'Login successful', token });
  });
}
