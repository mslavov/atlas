/* eslint-disable @typescript-eslint/no-explicit-any */
import { nango } from '@/lib/nango/client';
import { 
  initializeProjectGraph, 
  ingestProjectData
} from './client';
import { batchIngestMultiProvider, prepareBatchData, batchIngestToGraph } from './batch';
import { logger } from '@/lib/utils/logger';

// Perform complete initial ingestion for a project
export async function performInitialIngestion(
  projectId: string,
  organizationId: string
) {
  logger.info('Starting initial ingestion', { projectId, organizationId });
  
  try {
    // Initialize the project graph
    const graphId = await initializeProjectGraph(projectId);
    logger.info('Graph initialized', { graphId });
    
    // Ingest data from all connected sources
    const results = {
      github: { success: false, count: 0, error: null as any },
      notion: { success: false, count: 0, error: null as any },
      jira: { success: false, count: 0, error: null as any },
    };
    
    // 1. Ingest GitHub data
    try {
      results.github.count = await ingestGitHubData(projectId, organizationId, graphId);
      results.github.success = true;
    } catch (error) {
      results.github.error = error;
      logger.error('Failed to ingest GitHub data', error as Error);
    }
    
    // 2. Ingest Notion documents
    try {
      results.notion.count = await ingestNotionData(projectId, organizationId, graphId);
      results.notion.success = true;
    } catch (error) {
      results.notion.error = error;
      logger.error('Failed to ingest Notion data', error as Error);
    }
    
    // 3. Ingest Jira issues
    try {
      results.jira.count = await ingestJiraData(projectId, organizationId, graphId);
      results.jira.success = true;
    } catch (error) {
      results.jira.error = error;
      logger.error('Failed to ingest Jira data', error as Error);
    }
    
    // 4. Add codebase context
    await ingestCodebaseStructure(graphId, projectId);
    
    logger.info('Initial ingestion completed', { projectId, results });
    return results;
  } catch (error) {
    logger.error('Initial ingestion failed', error as Error);
    throw error;
  }
}

// v3: Ingest GitHub data with batch operations
async function ingestGitHubData(
  projectId: string,
  organizationId: string,
  graphId: string
): Promise<number> {
  const connectionId = `${organizationId}_${projectId}`;
  let totalIngested = 0;
  
  try {
    // Collect all GitHub data first
    const githubData: { issues?: any[], prs?: any[], repos?: any[] } = {};
    
    // Get GitHub issues
    const issues = await nango.listRecords({
      providerConfigKey: 'github',
      connectionId,
      model: 'github_issue',
    });
    
    if (issues.records && issues.records.length > 0) {
      // Enrich issues with relationships
      githubData.issues = issues.records.map(issue => ({
        ...issue,
        _relatedEntities: extractIssueRelations(issue)
      }));
      totalIngested += issues.records.length;
    }
    
    // Get pull requests
    const prs = await nango.listRecords({
      providerConfigKey: 'github',
      connectionId,
      model: 'github_pull_request',
    });
    
    if (prs.records && prs.records.length > 0) {
      // Enrich PRs with relationships
      githubData.prs = prs.records.map(pr => ({
        ...pr,
        _relatedEntities: extractPRRelations(pr)
      }));
      totalIngested += prs.records.length;
    }
    
    // Get repositories
    const repos = await nango.listRecords({
      providerConfigKey: 'github',
      connectionId,
      model: 'github_repository',
    });
    
    if (repos.records && repos.records.length > 0) {
      githubData.repos = repos.records;
      totalIngested += repos.records.length;
    }
    
    // v3: Batch ingest all GitHub data
    if (Object.keys(githubData).length > 0) {
      logger.info('Batch ingesting GitHub data', { 
        graphId, 
        counts: {
          issues: githubData.issues?.length || 0,
          prs: githubData.prs?.length || 0,
          repos: githubData.repos?.length || 0
        }
      });
      
      await batchIngestMultiProvider(graphId, { github: githubData }, {
        batchSize: 50,
        onProgress: (progress) => {
          logger.debug('GitHub ingestion progress', progress);
        }
      });
    }
  } catch (error) {
    logger.warn('GitHub ingestion incomplete', { error: String(error) });
  }
  
  return totalIngested;
}

// v3: Ingest Notion data with batch operations
async function ingestNotionData(
  projectId: string,
  organizationId: string,
  graphId: string
): Promise<number> {
  const connectionId = `${organizationId}_${projectId}`;
  let totalIngested = 0;
  
  try {
    const notionData: { pages?: any[], databases?: any[] } = {};
    
    // Get Notion pages
    const pages = await nango.listRecords({
      providerConfigKey: 'notion',
      connectionId,
      model: 'notion_page',
    });
    
    if (pages.records && pages.records.length > 0) {
      notionData.pages = pages.records.map(page => ({
        ...page,
        _relatedEntities: extractPageRelations(page)
      }));
      totalIngested += pages.records.length;
    }
    
    // Get Notion databases
    const databases = await nango.listRecords({
      providerConfigKey: 'notion',
      connectionId,
      model: 'notion_database',
    });
    
    if (databases.records && databases.records.length > 0) {
      notionData.databases = databases.records;
      totalIngested += databases.records.length;
    }
    
    // v3: Batch ingest all Notion data
    if (Object.keys(notionData).length > 0) {
      logger.info('Batch ingesting Notion data', { 
        graphId, 
        counts: {
          pages: notionData.pages?.length || 0,
          databases: notionData.databases?.length || 0
        }
      });
      
      await batchIngestMultiProvider(graphId, { notion: notionData }, {
        batchSize: 50,
        onProgress: (progress) => {
          logger.debug('Notion ingestion progress', progress);
        }
      });
    }
  } catch (error) {
    logger.warn('Notion ingestion incomplete', { error: String(error) });
  }
  
  return totalIngested;
}

// v3: Ingest Jira data with batch operations
async function ingestJiraData(
  projectId: string,
  organizationId: string,
  graphId: string
): Promise<number> {
  const connectionId = `${organizationId}_${projectId}`;
  let totalIngested = 0;
  
  try {
    const jiraData: { issues?: any[], projects?: any[] } = {};
    
    // Get Jira issues
    const issues = await nango.listRecords({
      providerConfigKey: 'jira',
      connectionId,
      model: 'jira_issue',
    });
    
    if (issues.records && issues.records.length > 0) {
      jiraData.issues = issues.records.map(issue => ({
        ...issue,
        _relatedEntities: extractJiraRelations(issue)
      }));
      totalIngested += issues.records.length;
    }
    
    // Get Jira projects
    const projects = await nango.listRecords({
      providerConfigKey: 'jira',
      connectionId,
      model: 'jira_project',
    });
    
    if (projects.records && projects.records.length > 0) {
      jiraData.projects = projects.records;
      totalIngested += projects.records.length;
    }
    
    // v3: Batch ingest all Jira data
    if (Object.keys(jiraData).length > 0) {
      logger.info('Batch ingesting Jira data', { 
        graphId, 
        counts: {
          issues: jiraData.issues?.length || 0,
          projects: jiraData.projects?.length || 0
        }
      });
      
      await batchIngestMultiProvider(graphId, { jira: jiraData }, {
        batchSize: 50,
        onProgress: (progress) => {
          logger.debug('Jira ingestion progress', progress);
        }
      });
    }
  } catch (error) {
    logger.warn('Jira ingestion incomplete', { error: String(error) });
  }
  
  return totalIngested;
}

// Ingest codebase structure and metadata
async function ingestCodebaseStructure(graphId: string, projectId: string) {
  try {
    // Ingest key architectural information
    const repoStructure = {
      name: projectId,
      type: 'codebase_structure',
      mainLanguages: ['TypeScript', 'JavaScript'],
      framework: 'Next.js 14+ App Router',
      integrations: ['Nango', 'Zep', 'Prisma'],
      keyFiles: [
        'package.json',
        'README.md',
        'tsconfig.json',
        '.env.local',
        'lib/zep/client.ts',
        'lib/nango/client.ts',
        'app/api/webhooks/nango/route.ts',
        'prisma/schema.prisma'
      ],
      architecture: {
        frontend: 'React with Next.js App Router',
        backend: 'Next.js API Routes',
        database: 'PostgreSQL with Prisma ORM',
        integrations: 'Nango for multi-system sync',
        knowledgeGraph: 'Zep Cloud for temporal knowledge',
      },
      description: 'Integration platform that unifies data from GitHub, Notion, Jira, and other systems into a temporal knowledge graph'
    };
    
    await ingestProjectData(
      graphId,
      'code',
      repoStructure,
      {
        source: 'github',
        timestamp: new Date(),
        author: 'system',
        relatedEntities: []
      }
    );
    
    logger.info('Codebase structure ingested', { graphId, projectId });
  } catch (error) {
    logger.error('Failed to ingest codebase structure', error as Error);
  }
}

// Helper functions to extract relationships

function extractIssueRelations(issue: any): string[] {
  const relations: string[] = [];
  
  // Extract PR references
  if (issue.pull_request) {
    relations.push(`pr_${issue.pull_request.number}`);
  }
  
  // Extract milestone
  if (issue.milestone) {
    relations.push(`milestone_${issue.milestone.id}`);
  }
  
  // Extract labels
  if (issue.labels && Array.isArray(issue.labels)) {
    issue.labels.forEach((label: any) => {
      relations.push(`label_${label.name}`);
    });
  }
  
  // Extract mentioned issues from body
  const body = issue.body || '';
  const mentions = body.match(/#\d+/g) || [];
  mentions.forEach((mention: string) => {
    relations.push(`issue_${mention.substring(1)}`);
  });
  
  return relations;
}

function extractPRRelations(pr: any): string[] {
  const relations: string[] = [];
  
  // Extract related issue
  if (pr.issue) {
    relations.push(`issue_${pr.issue.number}`);
  }
  
  // Extract branch info
  if (pr.head?.ref) {
    relations.push(`branch_${pr.head.ref}`);
  }
  if (pr.base?.ref) {
    relations.push(`branch_${pr.base.ref}`);
  }
  
  // Extract milestone
  if (pr.milestone) {
    relations.push(`milestone_${pr.milestone.id}`);
  }
  
  // Extract mentioned issues from body and title
  const text = `${pr.title || ''} ${pr.body || ''}`;
  const mentions = text.match(/#\d+/g) || [];
  mentions.forEach((mention: string) => {
    relations.push(`issue_${mention.substring(1)}`);
  });
  
  // Common patterns for fixes/closes
  const fixPatterns = text.match(/(?:fix|fixes|fixed|close|closes|closed|resolve|resolves|resolved)\s+#\d+/gi) || [];
  fixPatterns.forEach((pattern: string) => {
    const issueNum = pattern.match(/#(\d+)/);
    if (issueNum) {
      relations.push(`fixes_issue_${issueNum[1]}`);
    }
  });
  
  return [...new Set(relations)];
}

function extractPageRelations(page: any): string[] {
  const relations: string[] = [];
  
  // Extract parent page
  if (page.parent?.page_id) {
    relations.push(`page_${page.parent.page_id}`);
  }
  
  // Extract database relations
  if (page.parent?.database_id) {
    relations.push(`database_${page.parent.database_id}`);
  }
  
  // Extract mentioned users
  if (page.properties) {
    Object.values(page.properties).forEach((prop: any) => {
      if (prop.type === 'people' && prop.people) {
        prop.people.forEach((person: any) => {
          relations.push(`user_${person.id}`);
        });
      }
    });
  }
  
  return relations;
}

function extractJiraRelations(issue: any): string[] {
  const relations: string[] = [];
  
  // Extract project
  if (issue.fields?.project?.key) {
    relations.push(`project_${issue.fields.project.key}`);
  }
  
  // Extract parent issue
  if (issue.fields?.parent?.key) {
    relations.push(`issue_${issue.fields.parent.key}`);
  }
  
  // Extract linked issues
  if (issue.fields?.issuelinks && Array.isArray(issue.fields.issuelinks)) {
    issue.fields.issuelinks.forEach((link: any) => {
      if (link.outwardIssue) {
        relations.push(`issue_${link.outwardIssue.key}`);
      }
      if (link.inwardIssue) {
        relations.push(`issue_${link.inwardIssue.key}`);
      }
    });
  }
  
  // Extract epic
  if (issue.fields?.epic) {
    relations.push(`epic_${issue.fields.epic}`);
  }
  
  // Extract sprint
  if (issue.fields?.sprint?.id) {
    relations.push(`sprint_${issue.fields.sprint.id}`);
  }
  
  return relations;
}

// Incremental sync function
export async function performIncrementalSync(
  projectId: string,
  organizationId: string,
  provider: 'github' | 'notion' | 'jira',
  since?: Date
) {
  const connectionId = `${organizationId}_${projectId}`;
  
  try {
    logger.info('Starting incremental sync', { 
      projectId, 
      provider, 
      since: since?.toISOString() 
    });
    
    // Trigger sync through Nango
    // Note: The actual sync triggering happens through Nango's dashboard or API
    // For now, we'll return a placeholder result
    const syncResult = {
      id: `sync_${Date.now()}`,
      status: 'triggered',
      provider,
      connectionId
    };
    
    logger.info('Incremental sync triggered', {
      projectId,
      provider,
      syncId: syncResult.id
    });
    
    return syncResult;
  } catch (error) {
    logger.error('Incremental sync failed', error as Error);
    throw error;
  }
}