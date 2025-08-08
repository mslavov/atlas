/* eslint-disable @typescript-eslint/no-explicit-any */
import { zep } from './client';
import { logger } from '@/lib/utils/logger';

export interface SearchOptions {
  scope?: 'edges' | 'nodes' | 'episodes';
  limit?: number;
  timeRange?: { start: Date; end: Date };
  reranker?: 'bm25' | 'mmr' | 'cohere'; // v3: reranker support
  dateTime?: Date; // v3: datetime filtering
}

export interface ContextResult {
  facts?: Array<{
    fact: string;
    validFrom?: string;
    validUntil?: string;
    expired?: string;
  }>;
  relatedEntities?: any[];
  summary?: string;
  raw?: any;
}

// Search project knowledge using Zep's graph search
export async function searchProjectKnowledge(
  projectId: string,
  query: string,
  options: SearchOptions = {}
): Promise<string> {
  try {
    const graphId = `project_${projectId}`;
    
    // v3 enhanced search with reranker and datetime filtering
    const searchResults = await zep.graph.search({
      userId: graphId, // v3: use userId instead of embedding in query
      query: query,
      limit: options.limit || 20,
      reranker: options.reranker || 'mmr', // Use MMR for diversity by default
      scope: options.scope,
      dateTime: options.dateTime // Filter by time if provided
    } as any);
    
    // Build context from search results
    return buildContext(searchResults);
  } catch (error) {
    logger.error('Failed to search project knowledge', error as Error);
    return '';
  }
}

// Get comprehensive context about a specific entity
export async function getEntityContext(
  projectId: string,
  entityId: string,
  _depth: number = 2
): Promise<ContextResult> {
  try {
    const graphId = `project_${projectId}`;
    
    // v3: Search for all facts about this entity with graph context
    const facts = await zep.graph.search({
      userId: graphId,
      query: entityId,
      limit: 50,
      reranker: 'bm25' // Use BM25 for exact entity matching
    } as any);
    
    // Parse results based on Zep's response structure
    const result: ContextResult = {
      facts: [],
      relatedEntities: [],
      raw: facts
    };
    
    // Process search results based on actual Zep response format
    if (facts && typeof facts === 'object') {
      // Handle edges/facts
      if ('edges' in facts && Array.isArray(facts.edges)) {
        result.facts = facts.edges.map((e: any) => ({
          fact: e.fact || e.description || JSON.stringify(e),
          validFrom: e.valid_at,
          validUntil: e.invalid_at,
          expired: e.expired_at
        }));
      }
      
      // Handle nodes/entities
      if ('nodes' in facts && Array.isArray(facts.nodes)) {
        result.relatedEntities = facts.nodes;
      }
      
      // Generate summary
      result.summary = generateEntitySummary(result.facts || [], result.relatedEntities || []);
    }
    
    return result;
  } catch (error) {
    logger.error('Failed to get entity context', error as Error);
    return { facts: [], relatedEntities: [], summary: 'Failed to retrieve context' };
  }
}

// Search for temporal changes (timeline view)
export async function searchTimeline(
  projectId: string,
  query: string,
  options: SearchOptions = {}
): Promise<string> {
  try {
    const graphId = `project_${projectId}`;
    
    // v3: Search for episodes with temporal filtering
    const timelineResults = await zep.graph.search({
      userId: graphId,
      query: query,
      limit: options.limit || 50,
      scope: 'episodes', // Focus on temporal data
      dateTime: options.dateTime
    } as any);
    
    return formatTimeline(timelineResults);
  } catch (error) {
    logger.error('Failed to search timeline', error as Error);
    return '';
  }
}

// Analyze impact of changes
export async function analyzeImpact(
  projectId: string,
  entityOrQuery: string
): Promise<string> {
  try {
    const graphId = `project_${projectId}`;
    
    // v3: Search for impact with relationship focus
    const impactResults = await zep.graph.search({
      userId: graphId,
      query: `impact of ${entityOrQuery}`,
      limit: 30,
      scope: 'edges', // Focus on relationships for impact
      reranker: 'cohere' // Use Cohere for semantic understanding
    } as any);
    
    return formatImpactAnalysis(impactResults);
  } catch (error) {
    logger.error('Failed to analyze impact', error as Error);
    return 'Failed to analyze impact';
  }
}

// Build context string optimized for LLM consumption
function buildContext(searchResults: any): string {
  const contextParts: string[] = [];
  
  // Handle different response formats from Zep
  if (!searchResults) {
    return 'No results found';
  }
  
  // If it's a string response
  if (typeof searchResults === 'string') {
    return searchResults;
  }
  
  // If it has edges property
  if (searchResults.edges && Array.isArray(searchResults.edges)) {
    contextParts.push("RELEVANT FACTS:");
    searchResults.edges.forEach((edge: any) => {
      const validity = edge.invalid_at ? 
        `(Valid: ${edge.valid_at} to ${edge.invalid_at})` : 
        edge.valid_at ? `(Since: ${edge.valid_at})` : '';
      const fact = edge.fact || edge.description || JSON.stringify(edge);
      contextParts.push(`- ${fact} ${validity}`);
    });
  }
  
  // If it has nodes property
  if (searchResults.nodes && Array.isArray(searchResults.nodes)) {
    if (contextParts.length > 0) contextParts.push("");
    contextParts.push("RELATED ENTITIES:");
    searchResults.nodes.forEach((node: any) => {
      const name = node.name || node.id || 'Unknown';
      const summary = node.summary || node.description || '';
      contextParts.push(`- ${name}: ${summary}`);
    });
  }
  
  // If it has episodes property
  if (searchResults.episodes && Array.isArray(searchResults.episodes)) {
    if (contextParts.length > 0) contextParts.push("");
    contextParts.push("TEMPORAL SEQUENCE:");
    searchResults.episodes.forEach((episode: any) => {
      const time = episode.timestamp || episode.created_at || '';
      const event = episode.event || episode.description || JSON.stringify(episode);
      contextParts.push(`- [${time}] ${event}`);
    });
  }
  
  // If none of the above, try to extract useful information
  if (contextParts.length === 0) {
    if (Array.isArray(searchResults)) {
      contextParts.push("SEARCH RESULTS:");
      searchResults.forEach((result: any) => {
        contextParts.push(`- ${JSON.stringify(result)}`);
      });
    } else {
      contextParts.push(JSON.stringify(searchResults, null, 2));
    }
  }
  
  return contextParts.join('\n');
}

// Generate a summary for an entity based on facts and relationships
function generateEntitySummary(facts: any[], relatedEntities: any[]): string {
  const summaryParts: string[] = [];
  
  if (facts.length > 0) {
    summaryParts.push(`Found ${facts.length} facts.`);
    
    // Find most recent facts
    const recentFacts = facts
      .filter(f => !f.expired)
      .slice(0, 3);
    
    if (recentFacts.length > 0) {
      summaryParts.push('Recent facts:');
      recentFacts.forEach(f => {
        summaryParts.push(`- ${f.fact}`);
      });
    }
  }
  
  if (relatedEntities.length > 0) {
    summaryParts.push(`Connected to ${relatedEntities.length} entities.`);
  }
  
  return summaryParts.join(' ');
}

// Format timeline results
function formatTimeline(timelineResults: any): string {
  const timelineParts: string[] = ['TIMELINE:'];
  
  if (!timelineResults) {
    return 'No timeline data found';
  }
  
  // Handle episodes or temporal data
  if (timelineResults.episodes && Array.isArray(timelineResults.episodes)) {
    // Sort by timestamp
    const sorted = timelineResults.episodes.sort((a: any, b: any) => {
      const timeA = new Date(a.timestamp || a.created_at || 0).getTime();
      const timeB = new Date(b.timestamp || b.created_at || 0).getTime();
      return timeA - timeB;
    });
    
    sorted.forEach((episode: any) => {
      const time = episode.timestamp || episode.created_at || 'Unknown time';
      const event = episode.event || episode.description || JSON.stringify(episode);
      timelineParts.push(`[${time}] ${event}`);
    });
  } else if (Array.isArray(timelineResults)) {
    // Handle array of results
    timelineResults.forEach((item: any) => {
      const time = item.timestamp || item.created_at || 'Unknown time';
      const event = item.description || JSON.stringify(item);
      timelineParts.push(`[${time}] ${event}`);
    });
  } else {
    // Fallback to context building
    return buildContext(timelineResults);
  }
  
  return timelineParts.join('\n');
}

// Format impact analysis results
function formatImpactAnalysis(impactResults: any): string {
  const impactParts: string[] = ['IMPACT ANALYSIS:'];
  
  if (!impactResults) {
    return 'No impact data found';
  }
  
  // Extract affected entities
  if (impactResults.nodes && Array.isArray(impactResults.nodes)) {
    impactParts.push('\nAFFECTED ENTITIES:');
    impactResults.nodes.forEach((node: any) => {
      const name = node.name || node.id || 'Unknown';
      const impact = node.impact || node.description || 'Potentially affected';
      impactParts.push(`- ${name}: ${impact}`);
    });
  }
  
  // Extract related changes
  if (impactResults.edges && Array.isArray(impactResults.edges)) {
    impactParts.push('\nRELATED CHANGES:');
    impactResults.edges.forEach((edge: any) => {
      const change = edge.fact || edge.description || JSON.stringify(edge);
      impactParts.push(`- ${change}`);
    });
  }
  
  // If no specific structure, use generic context
  if (impactParts.length === 1) {
    return buildContext(impactResults);
  }
  
  return impactParts.join('\n');
}

// Export all search functions
export const search = {
  knowledge: searchProjectKnowledge,
  entity: getEntityContext,
  timeline: searchTimeline,
  impact: analyzeImpact,
};