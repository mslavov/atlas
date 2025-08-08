/* eslint-disable @typescript-eslint/no-explicit-any */
import { zep } from './client';
import { logger } from '@/lib/utils/logger';

export interface ContextOptions {
  mode?: string; // 'basic' or any other mode supported by Zep
  minRating?: number; // 0-1 relevance threshold
}

/**
 * Get optimized context block using Zep v3's thread.getUserContext
 * This replaces manual search and buildContext approach
 */
export async function getThreadContext(
  threadId: string,
  options: ContextOptions = {}
): Promise<string> {
  try {
    // v3 optimized context retrieval
    const context = await zep.thread.getUserContext(threadId, {
      mode: options.mode as any, // Cast to any for flexibility with Zep API
      minRating: options.minRating || 0.7
    } as any);
    
    logger.debug('Retrieved thread context', { 
      threadId, 
      mode: options.mode || 'summarized' 
    });
    
    // Convert context response to string if needed
    if (typeof context === 'string') {
      return context;
    } else if (context && typeof context === 'object') {
      // Handle context object response
      return JSON.stringify(context);
    }
    return '';
  } catch (error) {
    logger.error('Failed to get thread context', error as Error);
    
    // Fallback to basic mode if default mode fails
    if (!options.mode) {
      logger.info('Falling back to basic context mode', { threadId });
      return getThreadContext(threadId, { ...options, mode: 'basic' });
    }
    
    throw error;
  }
}

/**
 * Create a thread for a specific project conversation
 */
export async function createProjectThread(
  projectId: string,
  userId: string,
  metadata?: Record<string, any>
): Promise<string> {
  const threadId = `thread_${projectId}_${Date.now()}`;
  
  try {
    await zep.thread.create({
      threadId,
      userId: `project_${projectId}`, // Link to project graph
      metadata: {
        projectId,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        ...metadata
      }
    } as any);
    
    logger.info('Thread created', { threadId, projectId });
    return threadId;
  } catch (error) {
    logger.error('Failed to create thread', error as Error);
    throw error;
  }
}

/**
 * Add a message to a thread for context building
 */
export async function addMessageToThread(
  threadId: string,
  message: {
    role: 'user' | 'assistant' | 'system';
    content: string;
    name?: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  try {
    await zep.thread.addMessages(threadId, {
      messages: [{
        role: message.role as any,
        content: message.content,
        name: message.name,
        metadata: message.metadata
      }]
    } as any);
    
    logger.debug('Message added to thread', { threadId, role: message.role });
  } catch (error) {
    logger.error('Failed to add message to thread', error as Error);
    throw error;
  }
}

/**
 * Get thread messages with optional pagination
 */
export async function getThreadMessages(
  threadId: string,
  limit?: number
): Promise<any[]> {
  try {
    // v3: Get messages from a thread
    const response = await zep.thread.get(threadId) as any;
    const messages = response?.messages || [];
    
    logger.debug('Retrieved thread messages', { 
      threadId, 
      count: messages.length 
    });
    
    // Apply limit if specified
    return limit ? messages.slice(0, limit) : messages;
  } catch (error) {
    logger.error('Failed to get thread messages', error as Error);
    return [];
  }
}

/**
 * Search for threads related to a project
 */
export async function searchProjectThreads(
  projectId: string,
  query?: string
): Promise<any[]> {
  try {
    const userId = `project_${projectId}`;
    
    // Get threads associated with this project's user/graph
    // Note: Zep v3 doesn't have thread.search, using graph search instead
    const results = await zep.graph.search({
      userId,
      query: query || `thread project:${projectId}`,
      limit: 20
    } as any);
    
    // Extract thread-related results
    const threads = Array.isArray(results) ? results : [];
    
    logger.debug('Found project threads', { 
      projectId, 
      count: threads.length 
    });
    
    return threads;
  } catch (error) {
    logger.error('Failed to search project threads', error as Error);
    return [];
  }
}