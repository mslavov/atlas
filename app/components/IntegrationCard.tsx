import Image from 'next/image';

interface Provider {
  id: string;
  name: string;
  logoUrl: string;
  available?: boolean;
}

interface Connection {
  status?: 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'EXPIRED';
  metadata?: {
    accountName?: string;
    error?: unknown;
    lastError?: unknown;
  };
  lastSync?: string;
}

interface IntegrationCardProps {
  provider: Provider;
  connection?: Connection;
  onConnect: () => void;
  isConnecting: boolean;
}

export default function IntegrationCard({ provider, connection, onConnect, isConnecting }: IntegrationCardProps) {
  const isConnected = !!connection;
  const isAvailable = provider.available !== false;
  const status = connection?.status || 'INACTIVE';
  
  // Determine border color based on status
  const getBorderColor = () => {
    if (!isConnected) return isAvailable ? 'border-gray-700 hover:border-blue-500/50' : 'border-gray-700/50';
    switch (status) {
      case 'ACTIVE': return 'border-green-500/30';
      case 'ERROR': return 'border-red-500/30';
      case 'EXPIRED': return 'border-yellow-500/30';
      case 'INACTIVE': return 'border-gray-500/30';
      default: return 'border-gray-700';
    }
  };
  
  // Determine shadow color based on status
  const getShadowColor = () => {
    if (!isConnected) return isAvailable ? 'hover:shadow-lg hover:shadow-blue-500/10' : '';
    switch (status) {
      case 'ACTIVE': return 'shadow-lg shadow-green-500/10';
      case 'ERROR': return 'shadow-lg shadow-red-500/10';
      case 'EXPIRED': return 'shadow-lg shadow-yellow-500/10';
      case 'INACTIVE': return 'shadow-lg shadow-gray-500/10';
      default: return '';
    }
  };
  
  // Get status badge configuration
  const getStatusBadge = () => {
    switch (status) {
      case 'ACTIVE':
        return {
          bg: 'bg-green-900/50',
          text: 'text-green-400',
          border: 'border-green-500/30',
          label: 'Connected',
          icon: (
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )
        };
      case 'ERROR':
        return {
          bg: 'bg-red-900/50',
          text: 'text-red-400',
          border: 'border-red-500/30',
          label: 'Error',
          icon: (
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )
        };
      case 'EXPIRED':
        return {
          bg: 'bg-yellow-900/50',
          text: 'text-yellow-400',
          border: 'border-yellow-500/30',
          label: 'Expired',
          icon: (
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )
        };
      case 'INACTIVE':
        return {
          bg: 'bg-gray-700/50',
          text: 'text-gray-400',
          border: 'border-gray-500/30',
          label: 'Inactive',
          icon: (
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
            </svg>
          )
        };
      default:
        return null;
    }
  };
  
  const statusBadge = isConnected ? getStatusBadge() : null;
  
  return (
    <div className={`
      relative overflow-hidden rounded-xl transition-all duration-300
      bg-gray-800 ${getBorderColor()} ${getShadowColor()}
      ${!isAvailable && !isConnected ? 'opacity-60' : ''}
    `}>
      {/* Status badge */}
      {isConnected && statusBadge && (
        <div className="absolute top-3 right-3">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text} border ${statusBadge.border}`}>
            {statusBadge.icon}
            {statusBadge.label}
          </span>
        </div>
      )}
      
      <div className="p-6">
        {/* Provider info */}
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0 w-12 h-12 relative">
            <Image 
              src={provider.logoUrl} 
              alt={`${provider.name} logo`}
              width={48} 
              height={48}
              className={`
                transition-all duration-300 object-contain
                ${!isAvailable && !isConnected 
                  ? 'grayscale opacity-40' 
                  : isConnected 
                    ? 'opacity-100' 
                    : 'opacity-80 hover:opacity-100'
                }
              `}
            />
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-semibold text-white">{provider.name}</h3>
            {isConnected && connection.metadata?.accountName && (
              <p className="text-sm text-gray-400">{connection.metadata.accountName}</p>
            )}
          </div>
        </div>
        
        {/* Content */}
        <div className="mt-4">
          {isConnected ? (
            <div className="space-y-2">
              {/* Show error message if status is ERROR */}
              {status === 'ERROR' && connection.metadata?.lastError ? (
                <div className="text-xs text-red-400 bg-red-900/20 p-2 rounded border border-red-500/20 mb-2">
                  <p className="font-medium mb-1">Connection Error:</p>
                  <p className="text-red-400/80">
                    {typeof connection.metadata.lastError === 'object' 
                      ? (connection.metadata.lastError as { message?: string })?.message || JSON.stringify(connection.metadata.lastError)
                      : String(connection.metadata.lastError)}
                  </p>
                </div>
              ) : null}
              
              {/* Show expired message if status is EXPIRED */}
              {status === 'EXPIRED' ? (
                <div className="text-xs text-yellow-400 bg-yellow-900/20 p-2 rounded border border-yellow-500/20 mb-2">
                  <p className="font-medium">Authentication expired. Please reconnect.</p>
                </div>
              ) : null}
              
              <div className="flex items-center text-sm text-gray-400">
                <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Last synced: {connection.lastSync ? new Date(connection.lastSync).toLocaleString() : 'Never'}
              </div>
              
              {/* Show different button text based on status */}
              <button
                onClick={onConnect}
                className={`mt-3 w-full py-2 px-4 rounded-lg border transition-colors text-sm font-medium ${
                  status === 'ERROR' || status === 'EXPIRED'
                    ? 'bg-orange-600 text-white border-orange-500 hover:bg-orange-700'
                    : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600 hover:text-white'
                }`}
              >
                {status === 'ERROR' || status === 'EXPIRED' ? 'Reconnect' : 'Manage'}
              </button>
            </div>
          ) : isAvailable ? (
            <button
              onClick={onConnect}
              disabled={isConnecting}
              className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
            >
              {isConnecting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connecting...
                </span>
              ) : (
                'Connect'
              )}
            </button>
          ) : (
            <div className="text-center py-2">
              <div className="text-sm text-gray-500">
                <svg className="w-5 h-5 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className="font-medium text-gray-400">Not Available</p>
                <p className="text-xs mt-1 text-gray-500">Configure in Nango dashboard</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}