import type { FastifyInstance } from 'fastify';
import { S3Client } from '@aws-sdk/client-s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { presignedUploadRequestSchema } from '@flyer/shared';
import { env } from '../env.js';

let s3: S3Client | null = null;
function getS3(): S3Client | null {
  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_BUCKET) {
    return null;
  }
  if (!s3) {
    s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3;
}

export async function uploadsRoutes(app: FastifyInstance) {
  app.post('/api/uploads/presign', async (req, reply) => {
    const client = getS3();
    if (!client || !env.R2_BUCKET || !env.R2_PUBLIC_URL) {
      return reply.code(503).send({
        message: 'Image uploads are not configured on the server (missing R2 env vars).',
      });
    }

    const parsed = presignedUploadRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Bad Request', issues: parsed.error.issues });
    }
    const { fileName, contentType, contentLength } = parsed.data;

    const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : '';
    const key = `products/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${ext}`;

    const cmd = new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      ContentType: contentType,
      ContentLength: contentLength,
    });

    const uploadUrl = await getSignedUrl(client, cmd, { expiresIn: 300 });
    const publicUrl = `${env.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`;

    return reply.send({ uploadUrl, publicUrl, key });
  });
}
