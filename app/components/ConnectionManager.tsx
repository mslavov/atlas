'use client';

import { useState, useEffect } from 'react';
import IntegrationCard from './IntegrationCard';

// Base provider information with logo URLs
const PROVIDER_INFO = {
  github: { 
    name: 'GitHub', 
    logoUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg'
  },
  notion: { 
    name: 'Notion', 
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png'
  },
  jira: { 
    name: 'Jira', 
    logoUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/jira/jira-original.svg'
  },
  slack: { 
    name: 'Slack', 
    logoUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/slack/slack-original.svg'
  },
  linear: { 
    name: 'Linear', 
    logoUrl: '/linear-svgrepo-com.svg'
  },
  gitlab: { 
    name: 'GitLab', 
    logoUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/gitlab/gitlab-original.svg'
  },
  bitbucket: {
    name: 'Bitbucket',
    logoUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/bitbucket/bitbucket-original.svg'
  }
};

interface Connection {
  provider: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'EXPIRED';
  metadata?: {
    accountName?: string;
    error?: unknown;
    lastError?: unknown;
  };
  lastSync?: string;
}

interface ConnectionManagerProps {
  connections: Connection[];
  onConnectionUpdate: () => void;
}

export default function ConnectionManager({ connections, onConnectionUpdate }: ConnectionManagerProps) {
  const [connecting, setConnecting] = useState<string | null>(null);
  const [availableIntegrations, setAvailableIntegrations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchAvailableIntegrations();
  }, []);
  
  const fetchAvailableIntegrations = async () => {
    try {
      const res = await fetch('/api/integrations');
      const data = await res.json();
      const integrationIds = data.map((integration: { id: string }) => integration.id);
      setAvailableIntegrations(integrationIds);
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleConnect = async (providerId: string) => {
    setConnecting(providerId);
    
    try {
      // First, create a connection record in our database
      const createConnRes = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerId,
          userId: 'current-user-id',  // TODO: Get from auth context
          organizationId: 'current-org-id'  // TODO: Get from auth context
        })
      });
      
      if (!createConnRes.ok) {
        const error = await createConnRes.json();
        console.error('Failed to create connection record:', error);
        // Continue anyway - the webhook might still work
      }
      
      // Get session token from backend
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: 'current-user-id',
          organizationId: 'current-org-id',
          integrationId: providerId  // Pass specific integration
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        // Show error message to user
        console.error('Session creation failed:', data);
        alert(data.message || 'Failed to create session. Please check your Nango configuration.');
        setConnecting(null);
        return;
      }
      
      const { sessionToken } = data;
      
      // Dynamic import to avoid SSR issues
      const Nango = (await import('@nangohq/frontend')).default;
      
      // Initialize Nango with session token (no public key needed)
      const nango = new Nango({ connectSessionToken: sessionToken });
      
      // Open the connection UI
      const connect = nango.openConnectUI({
        onEvent: (event) => {
          if (event.type === 'connect') {
            console.log('Connection successful', event.payload);
            onConnectionUpdate();
            setConnecting(null);
          } else if (event.type === 'close') {
            console.log('Connection modal closed');
            setConnecting(null);
          }
        }
      });
    } catch (error) {
      console.error('Connection failed:', error);
      alert('An error occurred while connecting. Please try again.');
      setConnecting(null);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-10 w-10 text-blue-500 mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <div className="text-gray-400 font-medium">Loading integrations...</div>
        </div>
      </div>
    );
  }
  
  // Build providers list based on what's available in Nango and what we support
  const providers = Object.entries(PROVIDER_INFO).map(([id, info]) => ({
    id,
    ...info,
    available: availableIntegrations.includes(id)
  }));
  
  // Sort to show available integrations first
  providers.sort((a, b) => {
    if (a.available && !b.available) return -1;
    if (!a.available && b.available) return 1;
    return 0;
  });
  
  return (
    <div>
      {availableIntegrations.length === 0 && (
        <div className="mb-8 p-6 bg-yellow-900/20 border border-yellow-500/30 rounded-xl">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="text-yellow-400 font-semibold mb-1">No integrations configured</h3>
              <p className="text-yellow-500/80 text-sm">
                Set up your first integration in the{' '}
                <a href="https://app.nango.dev" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-yellow-400">
                  Nango dashboard
                </a>
                {' '}to get started with data synchronization.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Stats bar */}
      {availableIntegrations.length > 0 && (
        <div className="mb-6 flex items-center justify-between">
          <div className="flex gap-6">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-400">
                {connections.length} Connected
              </span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-400">
                {availableIntegrations.length} Available
              </span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gray-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-400">
                {providers.filter(p => !p.available).length} Not Configured
              </span>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {providers.map(provider => {
          const connection = connections.find(c => c.provider === provider.id);
          return (
            <IntegrationCard
              key={provider.id}
              provider={provider}
              connection={connection}
              onConnect={() => handleConnect(provider.id)}
              isConnecting={connecting === provider.id}
            />
          );
        })}
      </div>
    </div>
  );
}