/* eslint-disable @typescript-eslint/no-explicit-any */
import { ZepClient } from '@getzep/zep-cloud';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';
import { mapToZepNodeType, enrichEntityMetadata } from './ontology';

// Validate Zep environment variables
const zepEnvSchema = z.object({
  ZEP_API_KEY: z.string().min(1),
});

const zepEnv = zepEnvSchema.parse({
  ZEP_API_KEY: process.env.ZEP_API_KEY,
});

// Initialize Zep Cloud client
export const zep = new ZepClient({
  apiKey: zepEnv.ZEP_API_KEY,
});

// Create project-specific graph on initialization
export async function initializeProjectGraph(projectId: string) {
  const userId = `project_${projectId}`;
  
  try {
    // First, try to get the user to see if it exists
    try {
      await zep.user.get(userId);
      logger.debug('User already exists', { userId });
    } catch (error: any) {
      // User doesn't exist, create it
      if (error?.status === 404 || error?.message?.includes('not found')) {
        logger.info('Creating new user for project', { userId, projectId });
        await zep.user.add({
          userId: userId,
          email: `${projectId}@project.local`,
          firstName: 'Project',
          lastName: projectId,
          metadata: {
            type: 'project',
            projectId: projectId,
            createdAt: new Date().toISOString()
          }
        });
        logger.info('User created successfully', { userId });
      } else {
        // Some other error occurred
        throw error;
      }
    }
    
    // Now add initial data to the user's graph
    await zep.graph.add({
      userId: userId,  // Use userId for project namespacing
      type: 'json',
      data: JSON.stringify({
        projectId,
        initialized: true,
        name: `${projectId} Knowledge Graph`,
        description: `Complete knowledge graph for ${projectId} including code, docs, issues, PRs, and events`,
        createdAt: new Date().toISOString()
      })
    });
    
    logger.info('Project graph initialized', { userId, projectId });
    return userId;
  } catch (error) {
    logger.error('Failed to initialize project graph', error as Error);
    // Return userId even if initialization fails
    return userId;
  }
}

// Enhanced data ingestion that helps Zep build better graphs
export async function ingestProjectData(
  userId: string,  // Using userId to namespace data per project
  dataType: 'issue' | 'pr' | 'document' | 'event' | 'code' | 'sync',
  data: Record<string, any>,
  metadata: {
    source: 'github' | 'notion' | 'jira' | 'slack';
    timestamp: Date;
    author?: string;
    relatedEntities?: string[];
  }
) {
  try {
    // Map to standard node type
    const nodeType = mapToZepNodeType(dataType);
    const entityMetadata = enrichEntityMetadata(data, nodeType, metadata.source);
    
    // Enhanced data structure for v3 with ontology
    const enrichedData = {
      // Standard node properties
      nodeType: nodeType,
      nodeId: data.id || `${dataType}_${Date.now()}`,
      
      // Core data
      ...data,
      
      // v3 temporal metadata
      _temporal: {
        validFrom: metadata.timestamp.toISOString(),
        createdAt: data.created_at || metadata.timestamp.toISOString(),
        updatedAt: data.updated_at || metadata.timestamp.toISOString(),
      },
      
      // Standard relationships
      _relationships: {
        author: metadata.author,
        mentions: extractMentions(data),
        references: extractReferences(data),
        relatedTo: metadata.relatedEntities || []
      },
      
      // Source tracking
      _source: {
        system: metadata.source,
        timestamp: metadata.timestamp.toISOString(),
        dataType: dataType
      },
      
      // Enhanced entity metadata
      _metadata: entityMetadata
    };
    
    // v3: Add to graph with enhanced metadata
    await zep.graph.add({
      userId: userId,  // Use userId for project namespacing
      type: 'json',
      data: JSON.stringify(enrichedData),
      metadata: {
        nodeType: nodeType,
        source: metadata.source,
        timestamp: metadata.timestamp.toISOString()
      }
    } as any);
    
    // For important events, also add as text for better extraction
    if (dataType === 'event' && data.description) {
      await zep.graph.add({
        userId: userId,  // Use userId for project namespacing
        type: 'text',
        data: `Project ${userId}: ${metadata.timestamp.toISOString()} - ${data.description}`
      });
    }
    
    logger.debug('Data ingested to Zep graph', {
      userId,
      dataType,
      source: metadata.source
    });
  } catch (error) {
    logger.error('Failed to ingest data to Zep', error as Error);
    throw error;
  }
}

// Helper functions
function extractMentions(data: Record<string, any>): string[] {
  const text = JSON.stringify(data);
  const mentions = text.match(/@[\w-]+/g) || [];
  const issueRefs = text.match(/#\d+/g) || [];
  return [...new Set([...mentions, ...issueRefs])];
}

function extractReferences(data: Record<string, any>): string[] {
  const text = JSON.stringify(data);
  const urls = text.match(/https?:\/\/[^\s"]+/g) || [];
  const fileRefs = text.match(/[\w-]+\.(ts|js|py|java|go|md)/gi) || [];
  return [...new Set([...urls, ...fileRefs])];
}

// Map Nango model types to our data types
export function mapNangoModelToDataType(model: string): 'issue' | 'pr' | 'document' | 'event' | 'code' {
  const modelMap: Record<string, 'issue' | 'pr' | 'document' | 'event' | 'code'> = {
    'github_issue': 'issue',
    'github_pull_request': 'pr',
    'github_repository': 'code',
    'notion_page': 'document',
    'notion_database': 'document',
    'notion_block': 'document',
    'jira_issue': 'issue',
    'jira_project': 'code',
  };
  
  return modelMap[model] || 'event';
}

// Extract related entities from a record
export function extractRelatedEntities(record: Record<string, any>): string[] {
  const entities: string[] = [];
  
  // GitHub specific
  if (record.pull_request && typeof record.pull_request === 'object') {
    const pr = record.pull_request as any;
    if (pr.number) {
      entities.push(`pr_${pr.number}`);
    }
    if (pr.head?.ref) {
      entities.push(`branch_${pr.head.ref}`);
    }
  }
  
  if (record.issue && typeof record.issue === 'object') {
    const issue = record.issue as any;
    if (issue.number) {
      entities.push(`issue_${issue.number}`);
    }
  }
  
  // Extract issue/PR references from text
  const text = JSON.stringify(record);
  const issueRefs = text.match(/#\d+/g) || [];
  issueRefs.forEach(ref => {
    entities.push(`issue_${ref.substring(1)}`);
  });
  
  // Notion specific
  if (record.parent_id) {
    entities.push(`page_${String(record.parent_id)}`);
  }
  
  // Jira specific
  if (record.project_key) {
    entities.push(`project_${String(record.project_key)}`);
  }
  
  return [...new Set(entities)];
}

// Generate human-readable event descriptions
export function generateEventDescription(data: Record<string, any>): string {
  // Handle undefined or null data
  if (!data) {
    return 'Unknown event occurred';
  }
  
  const sender = data.sender as any;
  const action = String(data.action || 'unknown');
  
  if (data.pull_request && typeof data.pull_request === 'object') {
    const pr = data.pull_request as any;
    return `${sender?.login || 'Someone'} ${action} PR #${pr.number}: ${pr.title}`;
  }
  if (data.issue && typeof data.issue === 'object') {
    const issue = data.issue as any;
    return `${sender?.login || 'Someone'} ${action} issue #${issue.number}: ${issue.title}`;
  }
  if (data.comment && typeof data.comment === 'object') {
    const comment = data.comment as any;
    const body = String(comment.body || '');
    return `${sender?.login || 'Someone'} commented: ${body.substring(0, 100)}...`;
  }
  if (data.repository && typeof data.repository === 'object') {
    const repo = data.repository as any;
    return `Repository ${repo.name} ${action}`;
  }
  return `${sender?.login || 'System'} performed ${action}`;
}

// v3 aligned event schema
export const IntegrationEventSchema = z.object({
  provider: z.enum(['github', 'notion', 'jira', 'slack']),
  eventType: z.string(),
  timestamp: z.date(),
  payload: z.any(),
  metadata: z.object({
    userId: z.string().optional(),
    projectId: z.string().optional(),
    organizationId: z.string().optional(),
    threadId: z.string().optional(), // v3 terminology: session → thread
    connectionId: z.string().optional(),
    syncJobId: z.string().optional(),
  }),
});

export type IntegrationEvent = z.infer<typeof IntegrationEventSchema>;

// Updated recordEvent to use new graph-based approach
export const recordEvent = async (
  event: IntegrationEvent,
  retries = 3
): Promise<void> => {
  try {
    const validatedEvent = IntegrationEventSchema.parse(event);
    const projectId = validatedEvent.metadata.projectId || 'default';
    const userId = `project_${projectId}`;
    
    await ingestProjectData(
      userId,
      'event',
      {
        eventType: validatedEvent.eventType,
        payload: validatedEvent.payload,
        description: generateEventDescription(validatedEvent.payload)
      },
      {
        source: validatedEvent.provider,
        timestamp: validatedEvent.timestamp,
        author: validatedEvent.metadata.userId,
      }
    );
    
    logger.info('Event recorded successfully', {
      userId,
      projectId,
      eventType: validatedEvent.eventType,
      provider: validatedEvent.provider,
    });
  } catch (error) {
    if (retries > 0) {
      logger.warn(`Failed to record event, retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return recordEvent(event, retries - 1);
    }
    
    logger.error('Failed to record event after all retries', error as Error);
    throw error;
  }
};