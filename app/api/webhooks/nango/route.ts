import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { 
  recordEvent,
  ingestProjectData,
  mapNangoModelToDataType,
  extractRelatedEntities,
  generateEventDescription,
  initializeProjectGraph
} from '@/lib/zep/client';
import { logger } from '@/lib/utils/logger';
import { handleApiError } from '@/lib/errors/handlers';
import { prisma } from '@/lib/db/prisma';

const NangoWebhookEventSchema = z.object({
  provider: z.string(),
  type: z.enum([
    'sync.success',
    'sync.error',
    'auth.success',
    'auth.error',
    'connection.deleted',
    'webhook.forward',
    'auth', // Support legacy format
    'sync', // Support legacy format
  ]),
  connectionId: z.string(),
  syncJobId: z.string().optional(),
  data: z.any(),
  error: z.object({
    message: z.string(),
    code: z.string(),
  }).optional(),
  modifiedAfter: z.string().optional(),
  createdAt: z.string().optional().default(() => new Date().toISOString()), // Make optional with default
});

const verifyWebhookSignature = (
  body: string,
  signature: string | null,
  secret: string
): boolean => {
  if (!signature) return false;
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};

const requestCounts = new Map<string, { count: number; resetAt: number }>();

const checkRateLimit = (identifier: string): boolean => {
  const now = Date.now();
  const limit = requestCounts.get(identifier);
  
  if (!limit || limit.resetAt < now) {
    requestCounts.set(identifier, {
      count: 1,
      resetAt: now + 60000,
    });
    return true;
  }
  
  if (limit.count >= 100) {
    return false;
  }
  
  limit.count++;
  return true;
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.text();
    
    // Webhook signature verification is disabled for development
    // Uncomment the following code to enable signature verification in production:
    /*
    const signature = request.headers.get('x-nango-signature');
    const webhookSecret = process.env.NANGO_WEBHOOK_SECRET;
    
    if (webhookSecret && !verifyWebhookSignature(body, signature, webhookSecret)) {
      logger.warn('Invalid webhook signature', {
        ip: request.headers.get('x-forwarded-for'),
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    */
    
    const event = NangoWebhookEventSchema.parse(JSON.parse(body));
    
    if (!checkRateLimit(event.connectionId)) {
      logger.warn('Rate limit exceeded', { connectionId: event.connectionId });
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }
    
    // Normalize legacy webhook types
    let normalizedType = event.type;
    if (event.type === 'auth') {
      normalizedType = event.error ? 'auth.error' : 'auth.success';
    } else if (event.type === 'sync') {
      normalizedType = event.error ? 'sync.error' : 'sync.success';
    }
    
    const eventId = `${normalizedType}_${event.syncJobId || event.createdAt}`;
    
    // Extract project and organization IDs from connection ID
    const [organizationId, projectId] = event.connectionId.split('_');
    const userId = `project_${projectId || 'default'}`;
    
    // Ensure graph is initialized
    await initializeProjectGraph(projectId || 'default');
    
    // Record event to Zep using new graph-based approach
    await recordEvent({
      provider: event.provider as 'github' | 'notion' | 'jira' | 'slack',
      eventType: normalizedType,
      timestamp: new Date(event.createdAt || new Date().toISOString()),
      payload: event.data,
      metadata: {
        connectionId: event.connectionId,
        syncJobId: event.syncJobId,
        organizationId,
        userId: projectId,
        projectId: projectId || 'default',
      },
    });
    
    // Update connection status in database based on event type
    // Note: We only update existing connections, not create new ones
    // Connections should be created through the proper API flow with valid userId
    try {
      // First check if connection exists
      const existingConnection = await prisma.connection.findUnique({
        where: { connectionId: event.connectionId }
      });
      
      if (!existingConnection) {
        logger.info('Connection not found in database, skipping update', { 
          connectionId: event.connectionId,
          eventType: normalizedType 
        });
      } else {
        switch (normalizedType) {
          case 'auth.success':
            await prisma.connection.update({
              where: { connectionId: event.connectionId },
              data: { 
                status: 'ACTIVE',
                updatedAt: new Date(),
              },
            });
          break;
          
        case 'auth.error':
          if (existingConnection) {
            await prisma.connection.update({
              where: { connectionId: event.connectionId },
              data: { 
                status: 'ERROR',
                metadata: event.error ? { error: event.error } : undefined,
                updatedAt: new Date(),
              },
            });
          }
          break;
          
        case 'connection.deleted':
          if (existingConnection) {
            await prisma.connection.update({
              where: { connectionId: event.connectionId },
              data: { 
                status: 'INACTIVE',
                updatedAt: new Date(),
              },
            });
          }
          break;
          
        case 'sync.success':
          if (existingConnection) {
            await prisma.connection.update({
              where: { connectionId: event.connectionId },
              data: { 
                lastSyncAt: new Date(),
                updatedAt: new Date(),
              },
            });
          }
          break;
          
        case 'sync.error':
          // Update connection to error status if sync fails
          if (existingConnection) {
            await prisma.connection.update({
              where: { connectionId: event.connectionId },
              data: { 
                status: 'ERROR',
                metadata: event.error ? { lastError: event.error } : undefined,
                updatedAt: new Date(),
              },
            });
          }
          break;
        }
      }
    } catch (dbError) {
      // Log database upsert error but don't fail the webhook
      logger.error('Failed to upsert connection status', {
        error: dbError,
        connectionId: event.connectionId,
        eventType: normalizedType,
      });
    }
    
    switch (normalizedType) {
      case 'sync.success':
        logger.info('Sync successful', {
          provider: event.provider,
          connectionId: event.connectionId,
        });
        
        // Process synced data with rich context
        if (event.data && Array.isArray(event.data.records)) {
          for (const record of event.data.records) {
            const dataType = mapNangoModelToDataType(record._nango_metadata?.model || '');
            
            await ingestProjectData(
              userId,
              dataType,
              record,
              {
                source: event.provider as 'github' | 'notion' | 'jira' | 'slack',
                timestamp: new Date(record._nango_metadata?.last_modified_at || event.createdAt),
                author: record.author || record.creator || record.user?.login,
                relatedEntities: extractRelatedEntities(record)
              }
            );
          }
        }
        break;
      
      case 'sync.error':
        logger.error('Sync failed', {
          provider: event.provider,
          error: event.error,
          connectionId: event.connectionId,
        });
        break;
      
      case 'auth.success':
        logger.info('Authentication successful', {
          provider: event.provider,
          connectionId: event.connectionId,
        });
        break;
      
      case 'auth.error':
        logger.error('Authentication failed', {
          provider: event.provider,
          error: event.error,
          connectionId: event.connectionId,
        });
        break;
      
      case 'connection.deleted':
        logger.info('Connection deleted', {
          provider: event.provider,
          connectionId: event.connectionId,
        });
        break;
      
      case 'webhook.forward':
        logger.info('Webhook forwarded', {
          provider: event.provider,
          connectionId: event.connectionId,
        });
        
        // Real-time events get special treatment
        await ingestProjectData(
          userId,
          'event',
          {
            eventType: event.data?.action || 'unknown',
            payload: event.data,
            description: generateEventDescription(event.data)
          },
          {
            source: event.provider as 'github' | 'notion' | 'jira' | 'slack',
            timestamp: new Date(),
            author: event.data?.sender?.login || event.data?.user?.name
          }
        );
        break;
        
      // Handle legacy types (should be normalized above, but just in case)
      case 'auth':
        if (event.error) {
          logger.error('Authentication failed (legacy)', {
            provider: event.provider,
            error: event.error,
            connectionId: event.connectionId,
          });
        } else {
          logger.info('Authentication successful (legacy)', {
            provider: event.provider,
            connectionId: event.connectionId,
          });
        }
        break;
        
      case 'sync':
        if (event.error) {
          logger.error('Sync failed (legacy)', {
            provider: event.provider,
            error: event.error,
            connectionId: event.connectionId,
          });
        } else {
          logger.info('Sync successful (legacy)', {
            provider: event.provider,
            connectionId: event.connectionId,
          });
        }
        break;
    }
    
    const processingTime = Date.now() - startTime;
    
    logger.info('Webhook processed successfully', {
      eventType: normalizedType,
      originalType: event.type,
      provider: event.provider,
      processingTime,
    });
    
    return NextResponse.json(
      { 
        success: true,
        eventId,
        processingTime,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Webhook processing failed', error as Error);
    return handleApiError(error);
  }
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}