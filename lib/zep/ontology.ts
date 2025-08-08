/* eslint-disable @typescript-eslint/no-explicit-any */

// Zep v3 standard node types
export enum NodeType {
  PERSON = 'person',
  ORGANIZATION = 'organization',
  LOCATION = 'location',
  EVENT = 'event',
  PRODUCT = 'product',
  CONCEPT = 'concept',
  DOCUMENT = 'document',
  TASK = 'task',
  PROJECT = 'project'
}

// Zep v3 standard relationship types
export enum RelationType {
  KNOWS = 'knows',
  WORKS_WITH = 'works_with',
  LOCATED_AT = 'located_at',
  PARTICIPATED_IN = 'participated_in',
  CREATED = 'created',
  MENTIONS = 'mentions',
  RELATED_TO = 'related_to',
  PART_OF = 'part_of'
}

// Map our data types to Zep's ontology
export function mapToZepNodeType(
  dataType: 'issue' | 'pr' | 'document' | 'event' | 'code' | 'sync'
): NodeType {
  const mapping: Record<string, NodeType> = {
    'issue': NodeType.TASK,
    'pr': NodeType.TASK,
    'document': NodeType.DOCUMENT,
    'event': NodeType.EVENT,
    'code': NodeType.PROJECT,
    'sync': NodeType.EVENT
  };
  
  return mapping[dataType] || NodeType.CONCEPT;
}

// Extract relationship type from data
export function extractRelationType(
  source: any,
  target: any
): RelationType {
  // If it's a person-to-person relation
  if (source.author && target.author) {
    return RelationType.WORKS_WITH;
  }
  
  // If it's a creation relationship
  if (source.author && (target.type === 'issue' || target.type === 'pr' || target.type === 'document')) {
    return RelationType.CREATED;
  }
  
  // If it's a reference or mention
  if (source._relationships?.mentions?.includes(target.id)) {
    return RelationType.MENTIONS;
  }
  
  // If it's a parent-child relation
  if (source.parent_id === target.id || target.parent_id === source.id) {
    return RelationType.PART_OF;
  }
  
  // If it's an event participation
  if (source.type === 'event' && target.type === 'person') {
    return RelationType.PARTICIPATED_IN;
  }
  
  // Default relation
  return RelationType.RELATED_TO;
}

// Map provider-specific entities to standard types
export function mapProviderEntityToNode(provider: string, entityType: string): NodeType {
  const providerMappings: Record<string, Record<string, NodeType>> = {
    github: {
      user: NodeType.PERSON,
      organization: NodeType.ORGANIZATION,
      repository: NodeType.PROJECT,
      issue: NodeType.TASK,
      pull_request: NodeType.TASK,
      release: NodeType.EVENT,
      commit: NodeType.EVENT,
      milestone: NodeType.CONCEPT
    },
    notion: {
      user: NodeType.PERSON,
      workspace: NodeType.ORGANIZATION,
      page: NodeType.DOCUMENT,
      database: NodeType.CONCEPT,
      block: NodeType.DOCUMENT,
      comment: NodeType.EVENT
    },
    jira: {
      user: NodeType.PERSON,
      project: NodeType.PROJECT,
      issue: NodeType.TASK,
      epic: NodeType.PROJECT,
      sprint: NodeType.CONCEPT,
      board: NodeType.CONCEPT
    },
    slack: {
      user: NodeType.PERSON,
      workspace: NodeType.ORGANIZATION,
      channel: NodeType.LOCATION,
      message: NodeType.EVENT,
      thread: NodeType.CONCEPT
    }
  };
  
  return providerMappings[provider]?.[entityType] || NodeType.CONCEPT;
}

// Enhanced entity metadata for v3 graph
export function enrichEntityMetadata(
  data: any,
  nodeType: NodeType,
  provider: string
): Record<string, any> {
  const baseMetadata = {
    nodeType,
    provider,
    extractedAt: new Date().toISOString()
  };
  
  // Add type-specific metadata
  switch (nodeType) {
    case NodeType.PERSON:
      return {
        ...baseMetadata,
        name: data.name || data.login || data.displayName,
        email: data.email,
        avatar: data.avatar_url || data.avatarUrl,
        role: data.role || 'contributor'
      };
      
    case NodeType.TASK:
      return {
        ...baseMetadata,
        title: data.title || data.summary,
        status: data.state || data.status,
        priority: data.priority || 'medium',
        assignee: data.assignee?.login || data.assignee?.displayName,
        labels: data.labels || [],
        dueDate: data.due_date || data.duedate
      };
      
    case NodeType.DOCUMENT:
      return {
        ...baseMetadata,
        title: data.title || data.name,
        url: data.url || data.html_url,
        lastModified: data.last_edited_time || data.updated_at,
        author: data.created_by?.name || data.author?.login
      };
      
    case NodeType.PROJECT:
      return {
        ...baseMetadata,
        name: data.name || data.key,
        description: data.description,
        visibility: data.visibility || 'private',
        language: data.language,
        topics: data.topics || []
      };
      
    case NodeType.EVENT:
      return {
        ...baseMetadata,
        action: data.action || data.event,
        timestamp: data.created_at || data.timestamp,
        actor: data.sender?.login || data.actor?.displayName,
        target: data.repository?.name || data.project?.key
      };
      
    default:
      return baseMetadata;
  }
}

// Generate relationship metadata
export function generateRelationshipMetadata(
  relationType: RelationType,
  source: any,
  target: any
): Record<string, any> {
  return {
    type: relationType,
    strength: calculateRelationshipStrength(relationType, source, target),
    establishedAt: new Date().toISOString(),
    context: extractRelationshipContext(relationType, source, target)
  };
}

// Calculate relationship strength (0-1)
function calculateRelationshipStrength(
  relationType: RelationType,
  _source: any,
  _target: any
): number {
  // Strong relationships
  if (relationType === RelationType.CREATED || relationType === RelationType.PART_OF) {
    return 1.0;
  }
  
  // Medium relationships
  if (relationType === RelationType.WORKS_WITH || relationType === RelationType.MENTIONS) {
    return 0.7;
  }
  
  // Weak relationships
  return 0.3;
}

// Extract context for the relationship
function extractRelationshipContext(
  relationType: RelationType,
  source: any,
  target: any
): string {
  switch (relationType) {
    case RelationType.CREATED:
      return `${source.author || 'User'} created ${target.title || target.name || 'item'}`;
    case RelationType.MENTIONS:
      return `${source.title || source.name || 'Source'} mentions ${target.title || target.name || 'target'}`;
    case RelationType.PART_OF:
      return `${source.name || 'Item'} is part of ${target.name || 'parent'}`;
    case RelationType.WORKS_WITH:
      return `${source.name || 'Person'} works with ${target.name || 'person'}`;
    default:
      return `${source.id || 'source'} is related to ${target.id || 'target'}`;
  }
}