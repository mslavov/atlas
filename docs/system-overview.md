# System Overview - Atlas Integration Platform

**Last Updated**: August 6, 2025  
**Purpose**: Comprehensive system architecture and functionality overview

---

## Project Summary

Atlas is an integration platform that unifies data from GitHub, Notion, Jira, and other systems into a temporal knowledge graph using Zep Cloud. It enables intelligent search and context retrieval across all connected data sources, providing a unified view of project information, code, documentation, and events.

### Key Capabilities

- **Multi-System Integration**: Connects GitHub, Notion, Jira, and Slack via Nango
- **Temporal Knowledge Graph**: Uses Zep Cloud for automatic entity and relationship extraction with temporal tracking
- **Intelligent Search**: Context-aware search across all integrated data sources with timeline and impact analysis
- **Real-time Webhooks**: Processes real-time events from connected systems for immediate graph updates
- **Project-based Organization**: Isolated graphs per project with organization-level user management

---

## Architecture Overview

### Technology Stack

- **Frontend Framework**: Next.js 15.4.5 with App Router and React 19
- **Styling**: Tailwind CSS v4
- **Authentication**: Session-based with bcryptjs hashing
- **Database**: PostgreSQL with Prisma ORM v5.22.0
- **Language**: TypeScript 5 with strict mode
- **Package Manager**: npm (with pnpm-lock.yaml also present)

### External Services

- **Nango**: Multi-system sync platform for OAuth and data synchronization
- **Zep Cloud**: Temporal knowledge graph with automatic entity extraction
- **GitHub/Notion/Jira/Slack**: Source systems for data integration

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Atlas Integration Platform               │
├─────────────────────────────────────────────────────────────┤
│                       Presentation Layer                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ ConnectionMgr   │  │ IntegrationCard │  │ Search UI       │ │
│  │ Manage OAuth    │  │ Provider Status │  │ Knowledge Query │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                        Business Logic                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Webhook Handler │  │ Knowledge API   │  │ Sync Manager    │ │
│  │ Event Processing│  │ Search & Query  │  │ Data Ingestion  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                         Data Layer                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ PostgreSQL DB   │  │ Zep Knowledge   │  │ Nango OAuth     │ │
│  │ User/Conn Mgmt  │  │ Temporal Graph  │  │ Data Sync       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Knowledge Graph Engine

**Location**: `/lib/zep/client.ts`, `/lib/zep/search.ts`, `/lib/zep/ingestion.ts`

- **Graph Initialization**: Creates project-specific graphs with user namespacing
- **Data Ingestion**: Enriches data for optimal entity extraction by Zep
- **Intelligent Search**: Multiple search types (knowledge, entity, timeline, impact)
- **Temporal Tracking**: Automatic fact validity and timeline management

### 2. Integration Management

**Location**: `/lib/nango/client.ts`, `/app/components/ConnectionManager.tsx`

- **OAuth Flow**: Manages authentication with external providers
- **Connection Status**: Tracks active, inactive, error, and expired connections
- **Provider Discovery**: Dynamically loads available integrations from Nango
- **Real-time Updates**: Live connection status updates via webhooks

### 3. Webhook Processing Engine

**Location**: `/app/api/webhooks/nango/route.ts`

- **Event Normalization**: Handles legacy and modern webhook formats
- **Rate Limiting**: Prevents abuse with 100 requests/minute per connection
- **Signature Verification**: Optional webhook signature validation for production
- **Database Sync**: Updates connection status based on webhook events

### 4. API Layer

**Main Component**: `/app/api/` directory with route handlers

- **Knowledge API**: Search and ingestion endpoints for the knowledge graph
- **Connection Management**: CRUD operations for OAuth connections
- **Sync Control**: Manual sync triggering and status checking
- **Health Monitoring**: System status and diagnostics

---

## Data Flow

### Initial Ingestion Pipeline

1. **Graph Initialization**: Create project-specific graph in Zep Cloud
2. **Connection Discovery**: Find active OAuth connections via Nango
3. **Data Extraction**: Pull historical data from GitHub, Notion, Jira
4. **Data Enrichment**: Add metadata, relationships, and temporal context
5. **Graph Ingestion**: Feed enriched data to Zep for entity/relationship extraction
6. **Codebase Structure**: Add architectural metadata for better context

### Real-time Update Pipeline

1. **Webhook Receipt**: Nango forwards real-time events from providers
2. **Event Validation**: Verify signatures and normalize event format
3. **Connection Update**: Update database with latest sync/auth status
4. **Data Processing**: Extract records and enrich with relationships
5. **Graph Update**: Ingest new data into existing knowledge graph
6. **Timeline Building**: Zep automatically updates temporal relationships

### Data Structures

#### Connection Model

```typescript
interface Connection {
  id: string;
  provider: 'GITHUB' | 'NOTION' | 'JIRA' | 'SLACK';
  connectionId: string;
  userId: string;
  organizationId: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'EXPIRED';
  metadata: Json?;
  lastSyncAt: DateTime?;
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

#### Knowledge Search Request

```typescript
interface KnowledgeSearchRequest {
  projectId: string;
  query: string;
  type: 'search' | 'entity' | 'timeline' | 'impact';
  options?: {
    limit?: number;
    scope?: 'edges' | 'nodes' | 'episodes';
    timeRange?: { start: Date; end: Date; };
  };
}
```

---

## Current Implementation Status

### ✅ Completed Features

- **Zep Cloud Integration**: Graph-based knowledge storage with automatic entity extraction
- **Multi-Provider OAuth**: GitHub, Notion, Jira, Slack connection management
- **Webhook Processing**: Real-time event handling with rate limiting and normalization  
- **Intelligent Search**: Four search types (knowledge, entity, timeline, impact)
- **Data Ingestion**: Initial and incremental sync with relationship extraction

### 🔄 In Progress

- **Production Deployment**: Environment configuration and monitoring
- **Error Handling**: Enhanced error recovery and user notifications
- **Performance Optimization**: Query caching and batch processing

### 📋 Planned Features

- **Advanced Analytics**: Usage metrics and search performance tracking
- **Custom Integrations**: Support for additional data sources beyond core providers  
- **Multi-tenant Architecture**: Enhanced organization isolation and access controls
- **Search Enhancement**: Natural language query processing and result ranking

---

## Algorithm Details

### Entity Relationship Extraction

The system automatically extracts relationships from ingested data using:

1. **Reference Parsing**: Identifies issue numbers, PR references, user mentions
2. **Link Detection**: Extracts URLs, file references, and cross-system links
3. **Hierarchy Mapping**: Parent-child relationships in Notion pages and Jira epics
4. **Temporal Sequencing**: Orders events chronologically for timeline construction

### Knowledge Graph Search

Zep Cloud provides graph search capabilities with:

1. **Vector Similarity**: Semantic search across all ingested content
2. **Graph Traversal**: Navigate relationships between entities
3. **Temporal Filtering**: Query based on time ranges and fact validity
4. **Context Aggregation**: Combine multiple data sources for comprehensive results

---

## Performance Considerations

### Current Limitations

- **Sync Processing**: Large initial ingestions may take 5-10 minutes
- **Rate Limits**: Webhook processing limited to 100 requests/minute per connection
- **Memory Usage**: Knowledge graph searches may consume significant memory for large datasets
- **API Latency**: Zep Cloud queries depend on external service response times

### Optimization Strategies

- **Batch Processing**: Group related data updates to reduce API calls
- **Caching Layer**: Cache frequent searches and connection status
- **Incremental Updates**: Process only changed data rather than full re-sync
- **Connection Pooling**: Reuse database connections for better performance

---

## Security & Privacy

### Data Protection

- **OAuth Security**: Secure token handling with automatic refresh
- **Webhook Validation**: Optional HMAC signature verification  
- **Database Encryption**: Sensitive data encrypted at rest in PostgreSQL

### Access Control

- **Project Isolation**: Each project has separate knowledge graph namespace
- **Organization Boundaries**: Users can only access their organization's data
- **Connection Scoping**: OAuth tokens scoped to minimum required permissions

---

## Development Guidelines

### Code Organization

```
atlas/
├── app/                    # Next.js App Router
│   ├── api/               # API route handlers  
│   │   ├── auth/          # Authentication endpoints
│   │   ├── connections/   # Connection management
│   │   ├── knowledge/     # Knowledge graph API
│   │   ├── sync/          # Manual sync triggers
│   │   └── webhooks/      # Event processing
│   ├── components/        # React components
│   └── pages/             # Application pages
├── lib/                   # Shared library code
│   ├── db/                # Database client and utilities  
│   ├── errors/            # Error handling
│   ├── nango/             # Nango integration client
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   ├── validation/        # Data validation schemas
│   └── zep/               # Zep Cloud integration
├── prisma/                # Database schema and migrations
└── docs/                  # Documentation
```

### Key Principles

- **Type Safety**: Strict TypeScript with comprehensive type definitions
- **Error Handling**: Centralized error handling with structured logging
- **Data Validation**: Zod schemas for all API inputs and configurations
- **Separation of Concerns**: Clear boundaries between UI, API, and data layers

---

## Deployment & Operations

### Development Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Set up database
npx prisma generate
npx prisma db push

# Run development server
npm run dev
```

### Environment Variables

```bash
# Required for core functionality
ZEP_API_KEY=                # Zep Cloud API key
NANGO_SECRET_KEY=          # Nango secret key
DATABASE_URL=              # PostgreSQL connection string

# Optional for enhanced security
NANGO_WEBHOOK_SECRET=      # Webhook signature verification
DEFAULT_PROJECT_ID=        # Default project for development
```

### Production Considerations

- **Environment Validation**: Script validates all required env vars on startup
- **Database Migrations**: Use Prisma migrate for schema changes
- **Webhook Security**: Enable signature verification in production
- **Monitoring**: Structured logging with JSON format for log aggregation

---

## Future Roadmap

### Phase 1: Production Ready (Completed)
- ✅ Core integration platform with Zep Cloud
- ✅ Multi-provider OAuth and webhook processing
- ✅ Knowledge graph search and ingestion

### Phase 2: Enhanced Analytics (In Progress)
- 📋 Usage metrics and search performance tracking
- 📋 Advanced error monitoring and alerting
- 📋 Query optimization and caching

### Phase 3: Scale & Extend (Planned)
- 📋 Additional provider integrations (Linear, GitLab, etc.)
- 📋 Advanced search features and natural language queries
- 📋 Multi-tenant architecture improvements

---

This system overview provides a comprehensive understanding of the Atlas Integration Platform's architecture, capabilities, and development status. For specific implementation details, refer to the individual component documentation and API reference.

---

**Build Verification**: Always run `npm run build` after making changes to ensure TypeScript compilation passes. The project uses strict typing and ESLint rules that must be satisfied for successful builds.