import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { nango } from '@/lib/nango/client';
import { handleApiError, AppError } from '@/lib/errors/handlers';
import { logger } from '@/lib/utils/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // If database is available, fetch from database
    if (process.env.DATABASE_URL) {
      const connection = await prisma.connection.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, email: true, name: true } },
          organization: { select: { id: true, name: true } },
          syncJobs: {
            orderBy: { startedAt: 'desc' },
            take: 5,
          },
        },
      });
      
      if (!connection) {
        throw new AppError('Connection not found', 404);
      }
      
      return NextResponse.json(connection);
    }
    
    // Fallback: fetch from Nango
    const provider = request.nextUrl.searchParams.get('provider');
    if (!provider) {
      throw new AppError('Provider parameter required when database is not configured', 400);
    }
    
    const connection = await nango.getConnection(provider, id);
    
    return NextResponse.json({
      id,
      provider,
      connectionId: connection.connection_id,
      metadata: connection.metadata,
      createdAt: connection.created_at,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // If database is available, get connection details
    let provider: string;
    let connectionId: string;
    
    if (process.env.DATABASE_URL) {
      const connection = await prisma.connection.findUnique({
        where: { id },
      });
      
      if (!connection) {
        throw new AppError('Connection not found', 404);
      }
      
      provider = connection.provider.toLowerCase();
      connectionId = connection.connectionId;
    } else {
      provider = request.nextUrl.searchParams.get('provider') || '';
      connectionId = id;
      
      if (!provider) {
        throw new AppError('Provider parameter required when database is not configured', 400);
      }
    }
    
    // Delete from Nango
    await nango.deleteConnection(provider, connectionId);
    
    // Delete from database if available
    if (process.env.DATABASE_URL) {
      await prisma.connection.delete({
        where: { id },
      });
    }
    
    logger.info('Connection deleted', {
      provider,
      connectionId,
    });
    
    return NextResponse.json({
      success: true,
      message: 'Connection deleted successfully',
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    if (!process.env.DATABASE_URL) {
      throw new AppError('Database required for updating connections', 501);
    }
    
    const connection = await prisma.connection.update({
      where: { id },
      data: {
        metadata: body.metadata,
        status: body.status,
        lastSyncAt: body.lastSyncAt ? new Date(body.lastSyncAt) : undefined,
      },
    });
    
    logger.info('Connection updated', {
      connectionId: id,
    });
    
    return NextResponse.json(connection);
  } catch (error) {
    return handleApiError(error);
  }
}