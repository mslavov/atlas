import { Nango } from '@nangohq/node';
import { z } from 'zod';

const envSchema = z.object({
  NANGO_SECRET_KEY: z.string().min(1),
  NANGO_HOST: z.string().url().optional(),
});

const env = envSchema.parse({
  NANGO_SECRET_KEY: process.env.NANGO_SECRET_KEY,
  NANGO_HOST: process.env.NANGO_HOST,
});

export const nango = new Nango({
  secretKey: env.NANGO_SECRET_KEY,
  host: env.NANGO_HOST || 'https://api.nango.dev',
});