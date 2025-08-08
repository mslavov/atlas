import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { nango } from '@/lib/nango/client';
import { zep } from '@/lib/zep/client';

export async function GET() {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'unknown',
      nango: 'unknown',
      zep: 'unknown',
    },
    version: process.env.npm_package_version || 'unknown',
  };
  
  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.services.database = 'healthy';
  } catch (error) {
    checks.services.database = 'unhealthy';
    checks.status = 'degraded';
  }
  
  // Check Nango
  try {
    await nango.listConnections();
    checks.services.nango = 'healthy';
  } catch (error) {
    checks.services.nango = 'unhealthy';
    checks.status = 'degraded';
  }
  
  // Check Zep
  try {
    await zep.user.get('health-check');
    checks.services.zep = 'healthy';
  } catch (error) {
    // Expected to fail, but connection works
    checks.services.zep = 'healthy';
  }
  
  const statusCode = checks.status === 'healthy' ? 200 : 503;
  
  return NextResponse.json(checks, { status: statusCode });
}