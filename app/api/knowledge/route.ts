import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { search, type ContextResult } from '@/lib/zep/search';
import { performInitialIngestion, performIncrementalSync } from '@/lib/zep/ingestion';
import { getThreadContext, createProjectThread } from '@/lib/zep/context';
import { handleApiError } from '@/lib/errors/handlers';
import { logger } from '@/lib/utils/logger';

// Schema for search requests with v3 enhancements
const KnowledgeSearchSchema = z.object({
  projectId: z.string().min(1),
  query: z.string().min(1),
  type: z.enum(['search', 'entity', 'timeline', 'impact']),
  options: z.object({
    limit: z.number().optional(),
    scope: z.enum(['edges', 'nodes', 'episodes']).optional(),
    timeRange: z.object({
      start: z.string().transform(s => new Date(s)),
      end: z.string().transform(s => new Date(s)),
    }).optional(),
    reranker: z.enum(['bm25', 'mmr', 'cohere']).optional(), // v3: reranker support
    dateTime: z.string().transform(s => new Date(s)).optional(), // v3: datetime filtering
  }).optional(),
});

// v3: Schema for thread-based context retrieval
const ThreadContextSchema = z.object({
  threadId: z.string().min(1),
  mode: z.enum(['basic', 'summarized']).optional(),
  minRating: z.number().min(0).max(1).optional()
});

// v3: Schema for thread creation
const CreateThreadSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
  metadata: z.record(z.any()).optional()
});

// Schema for ingestion requests
const IngestionRequestSchema = z.object({
  projectId: z.string().min(1),
  organizationId: z.string().min(1),
  type: z.enum(['initial', 'incremental']),
  provider: z.enum(['github', 'notion', 'jira']).optional(),
  since: z.string().transform(s => new Date(s)).optional(),
});

// POST /api/knowledge - Search knowledge graph or get thread context
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // v3: Check if it's a thread context request
    if (body.threadId) {
      const validatedData = ThreadContextSchema.parse(body);
      const context = await getThreadContext(
        validatedData.threadId,
        {
          mode: validatedData.mode,
          minRating: validatedData.minRating
        }
      );
      
      logger.info('Thread context retrieved', {
        threadId: validatedData.threadId,
        mode: validatedData.mode || 'summarized'
      });
      
      return NextResponse.json({
        success: true,
        context,
        threadId: validatedData.threadId,
        mode: validatedData.mode || 'summarized'
      });
    }
    
    // v3: Check if it's a thread creation request
    if (body.createThread) {
      const validatedData = CreateThreadSchema.parse(body);
      const threadId = await createProjectThread(
        validatedData.projectId,
        validatedData.userId,
        validatedData.metadata
      );
      
      logger.info('Thread created', {
        threadId,
        projectId: validatedData.projectId
      });
      
      return NextResponse.json({
        success: true,
        threadId,
        projectId: validatedData.projectId,
        message: 'Thread created successfully'
      });
    }
    
    // Otherwise handle as search request with v3 enhancements
    const validatedData = KnowledgeSearchSchema.parse(body);
    
    let context: string | ContextResult;
    
    switch (validatedData.type) {
      case 'search':
        context = await search.knowledge(
          validatedData.projectId,
          validatedData.query,
          {
            ...validatedData.options,
            reranker: validatedData.options?.reranker, // v3: pass reranker
            dateTime: validatedData.options?.dateTime  // v3: pass datetime filter
          }
        );
        break;
        
      case 'entity':
        context = await search.entity(
          validatedData.projectId,
          validatedData.query,
          2
        );
        break;
        
      case 'timeline':
        context = await search.timeline(
          validatedData.projectId,
          validatedData.query,
          validatedData.options
        );
        break;
        
      case 'impact':
        context = await search.impact(
          validatedData.projectId,
          validatedData.query
        );
        break;
        
      default:
        context = 'Invalid search type';
    }
    
    logger.info('Knowledge search completed', {
      projectId: validatedData.projectId,
      type: validatedData.type,
      query: validatedData.query.substring(0, 50)
    });
    
    return NextResponse.json({
      success: true,
      context,
      query: validatedData.query,
      type: validatedData.type,
    });
  } catch (error) {
    logger.error('Knowledge search failed', error as Error);
    return handleApiError(error);
  }
}

// PUT /api/knowledge - Trigger ingestion
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = IngestionRequestSchema.parse(body);
    
    if (validatedData.type === 'initial') {
      // Perform initial ingestion of all data
      const results = await performInitialIngestion(
        validatedData.projectId,
        validatedData.organizationId
      );
      
      logger.info('Initial ingestion completed', {
        projectId: validatedData.projectId,
        results
      });
      
      return NextResponse.json({
        success: true,
        type: 'initial',
        results,
        message: 'Initial ingestion completed using v3 batch operations. Knowledge graph is being built.',
        performance: 'Optimized with batch ingestion for faster processing'
      });
    } else if (validatedData.type === 'incremental' && validatedData.provider) {
      // Perform incremental sync for a specific provider
      const syncResult = await performIncrementalSync(
        validatedData.projectId,
        validatedData.organizationId,
        validatedData.provider,
        validatedData.since
      );
      
      logger.info('Incremental sync triggered', {
        projectId: validatedData.projectId,
        provider: validatedData.provider,
        since: validatedData.since
      });
      
      return NextResponse.json({
        success: true,
        type: 'incremental',
        provider: validatedData.provider,
        syncId: syncResult.id,
        message: 'Incremental sync triggered. Data will be received via webhooks.',
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid ingestion request' },
        { status: 400 }
      );
    }
  } catch (error) {
    logger.error('Ingestion failed', error as Error);
    return handleApiError(error);
  }
}

// GET /api/knowledge - Get knowledge graph status
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing projectId parameter' },
        { status: 400 }
      );
    }
    
    // Get basic graph information
    const graphId = `project_${projectId}`;
    
    // v3: Search for initialization marker with improved search
    const graphInfo = await search.knowledge(
      projectId,
      'initialized:true',
      { limit: 1, reranker: 'bm25' } // Use exact match reranker
    );
    
    const isInitialized = graphInfo && graphInfo.includes('initialized');
    
    return NextResponse.json({
      success: true,
      projectId,
      graphId,
      initialized: isInitialized,
      status: isInitialized ? 'ready' : 'not_initialized',
      message: isInitialized 
        ? 'Knowledge graph is ready for queries'
        : 'Knowledge graph needs initialization. Call PUT /api/knowledge with type:"initial"',
    });
  } catch (error) {
    logger.error('Failed to get graph status', error as Error);
    return handleApiError(error);
  }
}

// DELETE /api/knowledge - Clear knowledge graph (use with caution)
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, confirm } = body;
    
    if (!projectId || confirm !== 'DELETE_ALL_DATA') {
      return NextResponse.json(
        { 
          error: 'Dangerous operation requires projectId and confirm:"DELETE_ALL_DATA"' 
        },
        { status: 400 }
      );
    }
    
    // Note: Zep doesn't provide a direct delete graph API in the current SDK
    // This would need to be implemented based on Zep's actual API capabilities
    logger.warn('Graph deletion requested', { projectId });
    
    return NextResponse.json({
      success: false,
      message: 'Graph deletion not implemented. Contact Zep support for data removal.',
    });
  } catch (error) {
    return handleApiError(error);
  }
}