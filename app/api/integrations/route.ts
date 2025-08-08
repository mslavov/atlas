import { NextResponse } from 'next/server';
import { nango } from '@/lib/nango/client';
import { handleApiError } from '@/lib/errors/handlers';
import { logger } from '@/lib/utils/logger';

export async function GET() {
  try {
    // Fetch all configured integrations from Nango
    const response = await nango.listIntegrations();
    
    // Map the integrations to a simpler format
    const integrations = response.configs.map((config) => ({
      id: config.unique_key,
      provider: config.provider,
      configured: true,
      authType: 'oauth2',
      createdAt: new Date().toISOString(),
    }));
    
    logger.info('Fetched integrations', { count: integrations.length });
    
    return NextResponse.json(integrations);
  } catch (error) {
    logger.error('Failed to fetch integrations', error as Error);
    
    // If Nango API fails, return empty array
    const errorDetails = error as { response?: { status?: number } };
    if (errorDetails.response?.status === 404 || errorDetails.response?.status === 401) {
      return NextResponse.json([]);
    }
    
    return handleApiError(error);
  }
}