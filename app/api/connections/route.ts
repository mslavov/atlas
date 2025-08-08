import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { nango } from '@/lib/nango/client';
import { handleApiError, AppError } from '@/lib/errors/handlers';
import { logger } from '@/lib/utils/logger';

const createConnectionSchema = z.object({
  provider: z.enum(['github', 'notion', 'jira']),
  userId: z.string().min(1),
  organizationId: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const organizationId = searchParams.get('organizationId');
    
    // If database is available, fetch from database
    if (process.env.DATABASE_URL) {
      const connections = await prisma.connection.findMany({
        where: {
          ...(userId && { userId }),
          ...(organizationId && { organizationId }),
        },
        include: {
          syncJobs: {
            orderBy: { startedAt: 'desc' },
            take: 1,
          },
        },
      });
      
      return NextResponse.json(connections.map(conn => ({
        id: conn.id,
        provider: conn.provider.toLowerCase(),
        status: conn.status,
        metadata: conn.metadata,
        lastSync: conn.lastSyncAt,
        lastSyncJob: conn.syncJobs[0],
      })));
    }
    
    // Fallback: fetch from Nango
    try {
      const connections = await nango.listConnections();
      
      return NextResponse.json(connections.connections.map(conn => ({
        id: conn.connection_id,
        provider: conn.provider_config_key,
        status: 'ACTIVE',
        metadata: conn.metadata,
        lastSync: conn.created,
      })));
    } catch (error) {
      logger.warn('Failed to fetch connections from Nango', { error });
      return NextResponse.json([]);
    }
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createConnectionSchema.parse(body);
    
    // Use a project-based connectionId format that matches what Nango/webhooks expect
    // Format: organizationId_projectId (where projectId could be derived from context)
    const projectId = process.env.DEFAULT_PROJECT_ID || 'atlas'; // TODO: Get from context
    const connectionId = `${validatedData.organizationId}_${projectId}`;
    
    // If database is available, store in database
    // Note: The actual connection creation happens through the Connect UI
    // This endpoint just prepares our database record
    if (process.env.DATABASE_URL) {
      // Check if user exists first
      const userExists = await prisma.user.findUnique({
        where: { id: validatedData.userId }
      });
      
      if (!userExists) {
        // Ensure organization exists first
        const orgExists = await prisma.organization.findUnique({
          where: { id: validatedData.organizationId }
        });
        
        if (!orgExists) {
          await prisma.organization.create({
            data: {
              id: validatedData.organizationId,
              name: validatedData.organizationId, // TODO: Get real org name
            }
          });
        }
        
        // Create a default user if it doesn't exist
        // In production, users should be created through proper auth flow
        await prisma.user.create({
          data: {
            id: validatedData.userId,
            email: `${validatedData.userId}@example.com`, // TODO: Get real email
            organizationId: validatedData.organizationId,
          }
        });
      }
      
      await prisma.connection.create({
        data: {
          provider: validatedData.provider.toUpperCase() as 'GITHUB' | 'NOTION' | 'JIRA',
          connectionId,
          userId: validatedData.userId,
          organizationId: validatedData.organizationId,
          status: 'INACTIVE', // Will be updated to ACTIVE when auth.success webhook is received
          metadata: { projectId }, // Store projectId in metadata
        },
      });
    }
    
    logger.info('Connection created', {
      provider: validatedData.provider,
      connectionId,
    });
    
    return NextResponse.json({
      success: true,
      connectionId,
      provider: validatedData.provider,
    });
  } catch (error) {
    return handleApiError(error);
  }
}