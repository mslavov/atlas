import { NextRequest, NextResponse } from 'next/server';
import { nango } from '@/lib/nango/client';
import { z } from 'zod';
import { handleApiError } from '@/lib/errors/handlers';

const sessionRequestSchema = z.object({
  userId: z.string().min(1),
  organizationId: z.string().min(1),
  userEmail: z.string().email().optional(),
  userName: z.string().optional(),
  orgName: z.string().optional(),
  integrationId: z.string().optional(), // Optional specific integration
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = sessionRequestSchema.parse(body);
    
    // If specific integration requested, use only that one
    // Otherwise fetch all available integrations
    let allowedIntegrations: string[];
    
    if (validatedData.integrationId) {
      // When user clicks a specific integration, only allow that one
      allowedIntegrations = [validatedData.integrationId];
    } else {
      // Fetch all available integrations
      try {
        const integrations = await nango.listIntegrations();
        allowedIntegrations = integrations.configs.map((config: { unique_key: string }) => config.unique_key);
      } catch (error) {
        console.warn('Failed to fetch integrations, using fallback', error);
        allowedIntegrations = ['notion']; // fallback
      }
    }
    
    // Create a connect session using the Nango SDK
    const response = await nango.createConnectSession({
      end_user: {
        id: validatedData.userId,
        email: validatedData.userEmail,
        display_name: validatedData.userName,
      },
      organization: {
        id: validatedData.organizationId,
        display_name: validatedData.orgName,
      },
      // Only allow connections to integrations that are actually configured
      allowed_integrations: allowedIntegrations,
    });
    
    return NextResponse.json({
      success: true,
      sessionToken: response.data.token,
      expiresAt: response.data.expires_at,
    });
  } catch (error) {
    // Log the full error for debugging
    const errorDetails = error as { message?: string; response?: { data?: unknown; status?: number } };
    console.error('Nango session creation failed:', {
      message: errorDetails.message,
      response: errorDetails.response?.data,
      status: errorDetails.response?.status,
    });
    
    // Check if it's a Nango configuration issue
    if (errorDetails.response?.status === 400) {
      return NextResponse.json(
        {
          error: 'Integration not configured',
          message: 'The integrations (GitHub, Notion, Jira) need to be configured in your Nango dashboard. Please visit https://app.nango.dev to set them up.',
          details: (errorDetails.response?.data as { error?: string })?.error || 'No integrations found',
        },
        { status: 400 }
      );
    }
    
    return handleApiError(error);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}