import type { FastifyReply, FastifyRequest } from 'fastify';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { userId: number; username: string; role: 'admin' };
    user: { userId: number; username: string; role: 'admin' };
  }
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
    if (req.user.role !== 'admin') {
      return reply.code(403).send({ message: 'Forbidden: admin access required' });
    }
  } catch {
    return reply.code(401).send({ message: 'Unauthorized' });
  }
}
