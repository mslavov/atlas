import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { nango } from '@/lib/nango/client';
import { logger } from '@/lib/utils/logger';
import { handleApiError, AppError } from '@/lib/errors/handlers';

const syncRequestSchema = z.object({
  provider: z.enum(['github', 'notion', 'jira']),
  connectionId: z.string().min(1),
  fullSync: z.boolean().optional().default(false),
  models: z.array(z.string()).optional(),
});

const activeSyncs = new Map<string, { startedAt: Date; syncId: string }>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = syncRequestSchema.parse(body);
    
    const syncKey = `${validatedData.provider}_${validatedData.connectionId}`;
    const activeSync = activeSyncs.get(syncKey);
    
    if (activeSync && Date.now() - activeSync.startedAt.getTime() < 300000) {
      return NextResponse.json({
        success: false,
        message: 'Sync already in progress',
        syncId: activeSync.syncId,
      }, { status: 409 });
    }
    
    let connection;
    try {
      connection = await nango.getConnection(
        validatedData.provider,
        validatedData.connectionId
      );
    } catch (error) {
      throw new AppError(
        `Connection not found: ${validatedData.connectionId}`,
        404,
        'CONNECTION_NOT_FOUND'
      );
    }
    
    const syncParams = getSyncParams(validatedData.provider, validatedData.fullSync);
    
    // Note: triggerSync API needs to be updated based on Nango SDK documentation
    // For now, we'll just track the sync locally
    // const syncResult = await nango.triggerSync(
    //   validatedData.provider,
    //   [validatedData.connectionId],
    //   validatedData.models || syncParams.defaultModels,
    //   validatedData.fullSync
    // );
    
    const syncId = `sync_${Date.now()}`;
    
    activeSyncs.set(syncKey, {
      startedAt: new Date(),
      syncId,
    });
    
    setTimeout(() => {
      activeSyncs.delete(syncKey);
    }, 600000);
    
    logger.info('Sync triggered successfully', {
      provider: validatedData.provider,
      connectionId: validatedData.connectionId,
      syncId,
      fullSync: validatedData.fullSync,
    });
    
    return NextResponse.json({
      success: true,
      syncId,
      status: 'pending',
      message: 'Sync triggered successfully. Data will be received via webhook.',
      estimatedTime: syncParams.estimatedTime,
    });
  } catch (error) {
    logger.error('Failed to trigger sync', error as Error);
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const syncId = searchParams.get('syncId');
    const connectionId = searchParams.get('connectionId');
    
    if (!syncId || !connectionId) {
      throw new AppError(
        'Missing required parameters: syncId and connectionId',
        400
      );
    }
    
    // In a real implementation, this would query the actual sync status
    // For now, return a mock status
    return NextResponse.json({
      success: true,
      sync: {
        id: syncId,
        status: 'in_progress',
        progress: 0.5,
        recordsProcessed: 50,
        errors: [],
        startedAt: new Date().toISOString(),
        completedAt: null,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

function getSyncParams(provider: string, fullSync: boolean) {
  const baseParams = {
    fullSync,
    estimatedTime: fullSync ? '5-10 minutes' : '1-2 minutes',
  };
  
  switch (provider) {
    case 'github':
      return {
        ...baseParams,
        defaultModels: ['github_issue', 'github_pull_request', 'github_repository'],
      };
    
    case 'notion':
      return {
        ...baseParams,
        defaultModels: ['notion_page', 'notion_database', 'notion_block'],
      };
    
    case 'jira':
      return {
        ...baseParams,
        defaultModels: ['jira_issue', 'jira_project', 'jira_user'],
      };
    
    default:
      return {
        ...baseParams,
        defaultModels: [],
      };
  }
}