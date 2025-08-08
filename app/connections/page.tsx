'use client';

import { useState, useEffect } from 'react';
import ConnectionManager from '@/app/components/ConnectionManager';

export default function ConnectionsPage() {
  interface ConnectionData {
    provider: string;
    status?: 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'EXPIRED';
    metadata?: {
      accountName?: string;
      error?: unknown;
      lastError?: unknown;
    };
    lastSync?: string;
  }
  
  const [connections, setConnections] = useState<ConnectionData[]>([]);
  
  useEffect(() => {
    fetchConnections();
  }, []);
  
  const fetchConnections = async () => {
    try {
      const res = await fetch('/api/connections');
      const data = await res.json();
      // Ensure data is an array
      if (Array.isArray(data)) {
        setConnections(data);
      } else {
        console.error('Invalid response from API:', data);
        setConnections([]);
      }
    } catch (error) {
      console.error('Failed to fetch connections:', error);
      setConnections([]);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Integrations</h1>
          <p className="text-gray-400">Connect your favorite tools and services to sync data seamlessly</p>
        </div>
        <ConnectionManager 
          connections={connections}
          onConnectionUpdate={fetchConnections}
        />
      </div>
    </div>
  );
}