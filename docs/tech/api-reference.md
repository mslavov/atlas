# API Reference - Atlas Integration Platform

**Last Updated**: January 8, 2025  
**Purpose**: Complete API endpoint documentation with Zep v3 enhancements

---

## Overview

The Atlas API provides endpoints for managing integrations, searching the knowledge graph, and controlling data synchronization. All endpoints return JSON responses and use standard HTTP status codes.

### Base URL
- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-domain.com/api`

### Authentication
The API uses session-based authentication. Include session cookies in requests or authenticate via the `/api/auth/session` endpoint.

### Response Format
```typescript
// Success Response
{
  "success": true,
  "data": any,
  "message"?: string
}

// Error Response  
{
  "success": false,
  "error": string,
  "code"?: string,
  "details"?: any
}
```

---

## Authentication Endpoints

### Create Session
Creates an authentication session for Nango OAuth flow.

**Endpoint**: `POST /api/auth/session`

**Request Body**:
```json
{
  "userId": "current-user-id",
  "organizationId": "current-org-id", 
  "integrationId": "github"
}
```

**Response**:
```json
{
  "success": true,
  "sessionToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2025-08-06T12:00:00.000Z"
}
```

**Status Codes**:
- `200 OK`: Session created successfully
- `400 Bad Request`: Missing required parameters
- `500 Internal Server Error`: Session creation failed

---

## Knowledge Graph API (v3 Enhanced)

### Search Knowledge Graph
Search across the project's knowledge graph with v3 enhancements including reranker support.

**Endpoint**: `POST /api/knowledge`

**Request Body (Search)**:
```json
{
  "projectId": "atlas",
  "query": "authentication flow",
  "type": "search",
  "options": {
    "limit": 20,
    "scope": "edges",
    "reranker": "mmr",  // v3: 'bm25', 'mmr', or 'cohere'
    "dateTime": "2025-01-08T00:00:00.000Z", // v3: datetime filtering
    "timeRange": {
      "start": "2025-01-01T00:00:00.000Z",
      "end": "2025-08-06T23:59:59.999Z"
    }
  }
}
```

### Thread Context Retrieval (v3 New)
Get optimized context using Zep v3's thread-based retrieval.

**Endpoint**: `POST /api/knowledge`

**Request Body (Thread Context)**:
```json
{
  "threadId": "thread_atlas_1234567890",
  "mode": "basic",  // 'basic' (<200ms) or 'summarized' (AI-optimized)
  "minRating": 0.7   // Relevance threshold (0-1)
}
```

**Request Body (Create Thread)**:
```json
{
  "createThread": true,
  "projectId": "atlas",
  "userId": "user-123",
  "metadata": {
    "purpose": "development-session",
    "tags": ["api", "authentication"]
  }
}
```

**Query Types**:
- `search`: General knowledge search
- `entity`: Get context about specific entity
- `timeline`: Temporal sequence of events
- `impact`: Analyze impact of changes

**Response (Search)**:
```json
{
  "success": true,
  "context": "RELEVANT FACTS:\n- User authentication implemented using session-based approach\n- OAuth flow managed through Nango integration",
  "query": "authentication flow",
  "type": "search"
}
```

**Response (Thread Context)**:
```json
{
  "success": true,
  "context": "Optimized context block from Zep v3...",
  "threadId": "thread_atlas_1234567890",
  "mode": "basic"
}
```

**Response (Create Thread)**:
```json
{
  "success": true,
  "threadId": "thread_atlas_1234567890",
  "projectId": "atlas",
  "message": "Thread created successfully"
}
```

**Status Codes**:
- `200 OK`: Search completed successfully
- `400 Bad Request`: Invalid query parameters
- `500 Internal Server Error`: Search failed

### Get Knowledge Graph Status
Check the initialization status of a project's knowledge graph.

**Endpoint**: `GET /api/knowledge?projectId={projectId}`

**Query Parameters**:
- `projectId` (required): The project identifier

**Response**:
```json
{
  "success": true,
  "projectId": "atlas",
  "graphId": "project_atlas",
  "initialized": true,
  "status": "ready",
  "message": "Knowledge graph is ready for queries"
}
```

**Status Codes**:
- `200 OK`: Status retrieved successfully
- `400 Bad Request`: Missing projectId parameter
- `500 Internal Server Error`: Status check failed

### Trigger Data Ingestion
Manually trigger initial or incremental data ingestion.

**Endpoint**: `PUT /api/knowledge`

**Request Body (Initial Ingestion)**:
```json
{
  "projectId": "atlas",
  "organizationId": "org-123",
  "type": "initial"
}
```

**Request Body (Incremental Sync)**:
```json
{
  "projectId": "atlas", 
  "organizationId": "org-123",
  "type": "incremental",
  "provider": "github",
  "since": "2025-08-01T00:00:00.000Z"
}
```

**Response (Initial)**:
```json
{
  "success": true,
  "type": "initial",
  "results": {
    "github": { "success": true, "count": 150, "error": null },
    "notion": { "success": true, "count": 75, "error": null },
    "jira": { "success": false, "count": 0, "error": "Connection not found" }
  },
  "message": "Initial ingestion completed using v3 batch operations. Knowledge graph is being built.",
  "performance": "Optimized with batch ingestion for faster processing"
}
```

**Response (Incremental)**:
```json
{
  "success": true,
  "type": "incremental", 
  "provider": "github",
  "syncId": "sync_1725627600000",
  "message": "Incremental sync triggered. Data will be received via webhooks."
}
```

**Status Codes**:
- `200 OK`: Ingestion triggered successfully
- `400 Bad Request`: Invalid request parameters
- `500 Internal Server Error`: Ingestion failed

### Clear Knowledge Graph
Permanently delete all data from a project's knowledge graph.

**Endpoint**: `DELETE /api/knowledge`

**Request Body**:
```json
{
  "projectId": "atlas",
  "confirm": "DELETE_ALL_DATA"
}
```

**Response**:
```json
{
  "success": false,
  "message": "Graph deletion not implemented. Contact Zep support for data removal."
}
```

**Status Codes**:
- `400 Bad Request`: Missing confirmation or projectId
- `501 Not Implemented`: Feature not available in current Zep SDK

---

## Connection Management API

### List Connections
Get all OAuth connections for the current user/organization.

**Endpoint**: `GET /api/connections`

**Response**:
```json
{
  "success": true,
  "connections": [
    {
      "id": "conn_github_123",
      "provider": "GITHUB",
      "connectionId": "org_atlas",
      "status": "ACTIVE",
      "lastSyncAt": "2025-08-06T10:30:00.000Z",
      "metadata": {
        "accountName": "username"
      },
      "createdAt": "2025-08-01T00:00:00.000Z",
      "updatedAt": "2025-08-06T10:30:00.000Z"
    }
  ]
}
```

**Status Codes**:
- `200 OK`: Connections retrieved successfully
- `500 Internal Server Error`: Database query failed

### Get Connection Details
Get detailed information about a specific connection.

**Endpoint**: `GET /api/connections/{connectionId}`

**Path Parameters**:
- `connectionId`: The connection identifier

**Response**:
```json
{
  "success": true,
  "connection": {
    "id": "conn_github_123",
    "provider": "GITHUB", 
    "connectionId": "org_atlas",
    "status": "ACTIVE",
    "metadata": {
      "accountName": "username",
      "repositories": ["atlas", "docs"],
      "permissions": ["read:user", "read:repo"]
    },
    "lastSyncAt": "2025-08-06T10:30:00.000Z",
    "syncJobs": [
      {
        "id": "job_123",
        "syncId": "sync_1725627600000",
        "status": "COMPLETED",
        "recordsProcessed": 150,
        "startedAt": "2025-08-06T10:00:00.000Z",
        "completedAt": "2025-08-06T10:30:00.000Z"
      }
    ]
  }
}
```

**Status Codes**:
- `200 OK`: Connection found and returned
- `404 Not Found`: Connection not found
- `500 Internal Server Error`: Database query failed

### Delete Connection
Remove an OAuth connection and stop data synchronization.

**Endpoint**: `DELETE /api/connections/{connectionId}`

**Response**:
```json
{
  "success": true,
  "message": "Connection deleted successfully"
}
```

**Status Codes**:
- `200 OK`: Connection deleted successfully
- `404 Not Found`: Connection not found
- `500 Internal Server Error`: Deletion failed

---

## Sync Management API

### Trigger Manual Sync
Manually trigger data synchronization for a specific provider.

**Endpoint**: `POST /api/sync`

**Request Body**:
```json
{
  "provider": "github",
  "connectionId": "org_atlas", 
  "fullSync": false,
  "models": ["github_issue", "github_pull_request"]
}
```

**Response**:
```json
{
  "success": true,
  "syncId": "sync_1725627600000",
  "status": "pending",
  "message": "Sync triggered successfully. Data will be received via webhook.",
  "estimatedTime": "1-2 minutes"
}
```

**Status Codes**:
- `200 OK`: Sync triggered successfully
- `409 Conflict`: Sync already in progress
- `404 Not Found`: Connection not found
- `500 Internal Server Error`: Sync trigger failed

### Get Sync Status
Check the status of a running or completed sync job.

**Endpoint**: `GET /api/sync?syncId={syncId}&connectionId={connectionId}`

**Query Parameters**:
- `syncId` (required): The sync job identifier
- `connectionId` (required): The connection identifier

**Response**:
```json
{
  "success": true,
  "sync": {
    "id": "sync_1725627600000",
    "status": "completed",
    "progress": 1.0,
    "recordsProcessed": 150,
    "errors": [],
    "startedAt": "2025-08-06T10:00:00.000Z",
    "completedAt": "2025-08-06T10:30:00.000Z"
  }
}
```

**Sync Statuses**:
- `pending`: Sync queued but not started
- `in_progress`: Currently syncing data
- `completed`: Sync finished successfully
- `failed`: Sync encountered errors

**Status Codes**:
- `200 OK`: Sync status retrieved
- `400 Bad Request`: Missing required parameters
- `404 Not Found`: Sync job not found
- `500 Internal Server Error`: Status check failed

---

## Integrations API

### List Available Integrations
Get all integrations configured in Nango that are available for connection.

**Endpoint**: `GET /api/integrations`

**Response**:
```json
{
  "success": true,
  "integrations": [
    {
      "id": "github",
      "name": "GitHub",
      "description": "Connect to GitHub repositories, issues, and pull requests",
      "logoUrl": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg",
      "status": "active",
      "models": ["github_issue", "github_pull_request", "github_repository"]
    },
    {
      "id": "notion", 
      "name": "Notion",
      "description": "Sync Notion pages, databases, and blocks",
      "logoUrl": "https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png",
      "status": "active",
      "models": ["notion_page", "notion_database", "notion_block"]
    }
  ]
}
```

**Status Codes**:
- `200 OK`: Integrations retrieved successfully
- `500 Internal Server Error`: Failed to fetch integrations

---

## Webhook Endpoints

### Nango Webhook Handler
Receives and processes webhooks from Nango for real-time data synchronization.

**Endpoint**: `POST /api/webhooks/nango`

**Headers**:
- `x-nango-signature`: HMAC signature for webhook verification (optional)

**Request Body (Sync Success)**:
```json
{
  "provider": "github",
  "type": "sync.success",
  "connectionId": "org_atlas",
  "syncJobId": "job_123",
  "data": {
    "records": [
      {
        "_nango_metadata": {
          "model": "github_issue",
          "last_modified_at": "2025-08-06T10:30:00.000Z"
        },
        "id": 123,
        "title": "Fix authentication bug",
        "state": "open",
        "user": { "login": "developer" },
        "created_at": "2025-08-06T09:00:00.000Z"
      }
    ]
  },
  "createdAt": "2025-08-06T10:30:00.000Z"
}
```

**Response**:
```json
{
  "success": true,
  "eventId": "sync.success_job_123",
  "processingTime": 250
}
```

**Event Types**:
- `sync.success`: Successful data synchronization
- `sync.error`: Synchronization failed
- `auth.success`: OAuth connection established
- `auth.error`: Authentication failed
- `connection.deleted`: Connection removed
- `webhook.forward`: Real-time event forwarded

**Status Codes**:
- `200 OK`: Webhook processed successfully
- `401 Unauthorized`: Invalid webhook signature
- `429 Too Many Requests`: Rate limit exceeded (100/minute per connection)
- `500 Internal Server Error`: Processing failed

### Webhook Validation
Health check endpoint for webhook configuration.

**Endpoint**: `HEAD /api/webhooks/nango`

**Response**: Empty body with status code only

**Status Codes**:
- `200 OK`: Webhook endpoint is available

---

## Health Monitoring API

### System Health Check
Verify system status and dependencies.

**Endpoint**: `GET /api/health`

**Response**:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-08-06T12:00:00.000Z",
  "services": {
    "database": "healthy",
    "zep": "healthy", 
    "nango": "healthy"
  },
  "version": "0.1.0"
}
```

**Status Codes**:
- `200 OK`: System is healthy
- `503 Service Unavailable`: System or dependencies unavailable

---

## Error Handling

### Common Error Responses

**Validation Error**:
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "projectId",
    "message": "Required field is missing"
  }
}
```

**Rate Limit Error**:
```json
{
  "success": false,
  "error": "Too many requests",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60
}
```

**Service Unavailable**:
```json
{
  "success": false,
  "error": "External service unavailable", 
  "code": "SERVICE_UNAVAILABLE",
  "service": "zep"
}
```

### Error Codes

| Code | Description | Action |
|------|-------------|---------|
| `VALIDATION_ERROR` | Request data validation failed | Check request format |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Wait and retry |
| `SERVICE_UNAVAILABLE` | External service down | Retry later |
| `CONNECTION_NOT_FOUND` | OAuth connection missing | Reconnect integration |
| `GRAPH_NOT_INITIALIZED` | Knowledge graph needs setup | Run initial ingestion |
| `UNAUTHORIZED` | Authentication required | Check session |

---

## SDK and Client Examples

### JavaScript/TypeScript Client

```typescript
class AtlasClient {
  constructor(private baseUrl: string, private sessionToken?: string) {}

  async searchKnowledge(projectId: string, query: string, type = 'search') {
    const response = await fetch(`${this.baseUrl}/knowledge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.sessionToken}`
      },
      body: JSON.stringify({ projectId, query, type })
    });
    
    return await response.json();
  }

  async triggerSync(provider: string, connectionId: string, fullSync = false) {
    const response = await fetch(`${this.baseUrl}/sync`, {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, connectionId, fullSync })
    });
    
    return await response.json();
  }
}

// Usage
const client = new AtlasClient('http://localhost:3000/api');
const results = await client.searchKnowledge('atlas', 'authentication');
```

### cURL Examples

```bash
# Search knowledge graph
curl -X POST http://localhost:3000/api/knowledge \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "atlas",
    "query": "authentication flow", 
    "type": "search"
  }'

# Get connection status
curl -X GET "http://localhost:3000/api/connections/org_atlas"

# Trigger manual sync
curl -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "github",
    "connectionId": "org_atlas",
    "fullSync": false
  }'
```

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/knowledge` (search) | 100 requests | per minute |
| `/api/webhooks/nango` | 100 requests | per minute per connection |
| `/api/sync` | 10 requests | per minute per connection |
| All other endpoints | 1000 requests | per minute |

Rate limits are per IP address for unauthenticated endpoints and per user session for authenticated endpoints.

---

## Versioning

The API currently uses implicit versioning. Breaking changes will be communicated via:
- Documentation updates
- Migration guides 
- Deprecation notices

Future versions will use explicit versioning in the URL path (e.g., `/api/v2/knowledge`).

---

This API reference provides comprehensive documentation for all Atlas Integration Platform endpoints. For implementation examples and integration guides, refer to the system overview and component documentation.