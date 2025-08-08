/* eslint-disable @typescript-eslint/no-explicit-any */
import { zep } from './client';
import { logger } from '@/lib/utils/logger';
import { mapToZepNodeType, enrichEntityMetadata } from './ontology';

interface BatchData {
  type: 'json' | 'text';
  data: string;
  metadata?: Record<string, any>;
}

interface BatchIngestionOptions {
  batchSize?: number;
  delayMs?: number;
  onProgress?: (progress: { current: number; total: number }) => void;
}

/**
 * Batch ingest data to Zep for better performance
 */
export async function batchIngestToGraph(
  userId: string,
  items: BatchData[],
  options: BatchIngestionOptions = {}
): Promise<void> {
  const { 
    batchSize = 50, 
    delayMs = 100,
    onProgress 
  } = options;
  
  try {
    logger.info('Starting batch ingestion', { 
      userId, 
      totalItems: items.length,
      batchSize 
    });
    
    // Process in batches to avoid rate limits
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      // v3 supports batch operations
      await Promise.all(
        batch.map(item => 
          zep.graph.add({
            userId,
            type: item.type,
            data: item.data,
            metadata: item.metadata
          } as any)
        )
      );
      
      const progress = Math.min(i + batchSize, items.length);
      
      logger.info(`Batch ingested ${batch.length} items`, {
        userId,
        progress: `${progress}/${items.length}`
      });
      
      // Call progress callback if provided
      if (onProgress) {
        onProgress({ current: progress, total: items.length });
      }
      
      // Rate limiting pause between batches
      if (i + batchSize < items.length && delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    logger.info('Batch ingestion completed', { userId, totalItems: items.length });
  } catch (error) {
    logger.error('Batch ingestion failed', error as Error);
    throw error;
  }
}

/**
 * Prepare batch data from various sources
 */
export function prepareBatchData(
  records: any[],
  dataType: 'issue' | 'pr' | 'document' | 'event' | 'code' | 'sync',
  source: 'github' | 'notion' | 'jira' | 'slack'
): BatchData[] {
  return records.map(record => {
    const nodeType = mapToZepNodeType(dataType);
    const entityMetadata = enrichEntityMetadata(record, nodeType, source);
    
    const enrichedData = {
      nodeType: nodeType,
      nodeId: record.id || `${dataType}_${Date.now()}_${Math.random()}`,
      ...record,
      _temporal: {
        validFrom: record.created_at || new Date().toISOString(),
        createdAt: record.created_at || new Date().toISOString(),
        updatedAt: record.updated_at || new Date().toISOString(),
      },
      _source: {
        system: source,
        dataType: dataType
      },
      _metadata: entityMetadata
    };
    
    return {
      type: 'json' as const,
      data: JSON.stringify(enrichedData),
      metadata: {
        nodeType: nodeType,
        source: source,
        dataType: dataType,
        timestamp: new Date().toISOString()
      }
    };
  });
}

/**
 * Batch ingest from multiple providers in parallel
 */
export async function batchIngestMultiProvider(
  userId: string,
  providerData: {
    github?: { issues?: any[], prs?: any[], repos?: any[] };
    notion?: { pages?: any[], databases?: any[] };
    jira?: { issues?: any[], projects?: any[] };
  },
  options: BatchIngestionOptions = {}
): Promise<void> {
  const allBatchData: BatchData[] = [];
  
  // Prepare GitHub data
  if (providerData.github) {
    if (providerData.github.issues) {
      allBatchData.push(...prepareBatchData(providerData.github.issues, 'issue', 'github'));
    }
    if (providerData.github.prs) {
      allBatchData.push(...prepareBatchData(providerData.github.prs, 'pr', 'github'));
    }
    if (providerData.github.repos) {
      allBatchData.push(...prepareBatchData(providerData.github.repos, 'code', 'github'));
    }
  }
  
  // Prepare Notion data
  if (providerData.notion) {
    if (providerData.notion.pages) {
      allBatchData.push(...prepareBatchData(providerData.notion.pages, 'document', 'notion'));
    }
    if (providerData.notion.databases) {
      allBatchData.push(...prepareBatchData(providerData.notion.databases, 'document', 'notion'));
    }
  }
  
  // Prepare Jira data
  if (providerData.jira) {
    if (providerData.jira.issues) {
      allBatchData.push(...prepareBatchData(providerData.jira.issues, 'issue', 'jira'));
    }
    if (providerData.jira.projects) {
      allBatchData.push(...prepareBatchData(providerData.jira.projects, 'code', 'jira'));
    }
  }
  
  logger.info('Prepared batch data for multi-provider ingestion', {
    userId,
    totalItems: allBatchData.length,
    providers: Object.keys(providerData)
  });
  
  // Ingest all data in optimized batches
  await batchIngestToGraph(userId, allBatchData, options);
}

/**
 * Stream large datasets with chunking
 */
export async function* streamIngestToGraph(
  userId: string,
  dataStream: AsyncIterable<any>,
  dataType: 'issue' | 'pr' | 'document' | 'event' | 'code' | 'sync',
  source: 'github' | 'notion' | 'jira' | 'slack',
  chunkSize: number = 100
): AsyncGenerator<{ processed: number; current: any }, void, unknown> {
  let buffer: any[] = [];
  let totalProcessed = 0;
  
  try {
    for await (const item of dataStream) {
      buffer.push(item);
      
      // Process chunk when buffer is full
      if (buffer.length >= chunkSize) {
        const batchData = prepareBatchData(buffer, dataType, source);
        await batchIngestToGraph(userId, batchData, { batchSize: 50 });
        
        totalProcessed += buffer.length;
        yield { processed: totalProcessed, current: buffer[buffer.length - 1] };
        
        buffer = [];
      }
    }
    
    // Process remaining items
    if (buffer.length > 0) {
      const batchData = prepareBatchData(buffer, dataType, source);
      await batchIngestToGraph(userId, batchData, { batchSize: 50 });
      
      totalProcessed += buffer.length;
      yield { processed: totalProcessed, current: buffer[buffer.length - 1] };
    }
    
    logger.info('Stream ingestion completed', { 
      userId, 
      totalProcessed,
      dataType,
      source 
    });
  } catch (error) {
    logger.error('Stream ingestion failed', error as Error);
    throw error;
  }
}