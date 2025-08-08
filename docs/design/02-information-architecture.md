# Information Architecture - Atlas Integration Platform

## Overview
The information architecture of Atlas defines how data, features, and navigation are organized to help users efficiently find and understand information across multiple integrated platforms.

---

## Core Information Hierarchy

### Level 1: Organization
The highest level of information organization, representing the company or team using Atlas.

```
Organization (Acme Corp)
├── Users (Team Members)
├── Projects (Isolated Knowledge Spaces)
└── Connections (Integration Points)
```

**User Mental Model**: "My company's workspace"

### Level 2: Projects
Logical groupings of related information with isolated knowledge graphs.

```
Project (Atlas Development)
├── Knowledge Graph (All project data)
├── Integrations (Active connections)
├── Search Contexts (Saved queries)
└── Team Members (Access control)
```

**User Mental Model**: "My team's project space"

### Level 3: Integrated Data Sources
Individual platforms connected to aggregate information.

```
Data Sources
├── GitHub (Code & Issues)
├── Notion (Documentation)
├── Jira (Task Management)
└── Slack (Communications)
```

**User Mental Model**: "Where my information comes from"

### Level 4: Information Types
Categories of information available across all sources.

```
Information Types
├── Entities (People, Projects, Documents)
├── Relationships (Dependencies, References)
├── Events (Changes, Updates, Actions)
└── Temporal Data (Timelines, Histories)
```

**User Mental Model**: "What I can find"

---

## Navigation Structure

### Primary Navigation

```
Atlas Platform
├── Home (Dashboard)
│   ├── Recent Searches
│   ├── Connection Status
│   └── Activity Feed
├── Search
│   ├── Knowledge Search
│   ├── Entity Explorer
│   ├── Timeline View
│   └── Impact Analysis
├── Connections
│   ├── Active Integrations
│   ├── Available Integrations
│   └── Connection Settings
├── Projects
│   ├── Current Project
│   ├── Switch Project
│   └── Project Settings
└── Settings
    ├── User Profile
    ├── Organization
    └── Preferences
```

### Information Grouping Principles

#### 1. **By Source**
Users can filter information by its origin:
- GitHub data only
- Notion content only
- Jira issues only
- Everything (default)

#### 2. **By Time**
Temporal organization of information:
- Today
- This Week
- This Month
- Custom Range
- All Time

#### 3. **By Type**
Categorical organization:
- Documents (Notion pages, README files)
- Issues (GitHub issues, Jira tickets)
- Code (Pull requests, commits)
- People (Contributors, assignees)
- Projects (Repositories, Jira projects)

#### 4. **By Relationship**
Connected information:
- Direct relationships (explicitly linked)
- Inferred relationships (automatically detected)
- Temporal relationships (happened around same time)
- Causal relationships (one caused another)

---

## Search Information Architecture

### Search Result Organization

```
Search Results for "authentication"
├── Best Matches (AI-ranked top results)
├── By Source
│   ├── GitHub (15 results)
│   ├── Notion (8 results)
│   └── Jira (3 results)
├── By Type
│   ├── Documentation (10 results)
│   ├── Code (12 results)
│   └── Issues (4 results)
└── By Time
    ├── Recent (Last 7 days)
    ├── Relevant Period (When most activity occurred)
    └── Historical (Older results)
```

### Search Context Layers

#### Layer 1: Query Understanding
- Natural language processing
- Synonym recognition
- Intent detection (looking for how-to, definition, problem, etc.)

#### Layer 2: Result Ranking
- Relevance scoring
- Recency weighting
- Authority scoring (official docs vs comments)
- User context (role-based prioritization)

#### Layer 3: Result Enrichment
- Automatic summarization
- Relationship highlighting
- Timeline context
- Related entities

---

## Connection Management Architecture

### Connection States
Clear visual hierarchy of connection status:

```
Connection Status Hierarchy
├── Healthy (Green)
│   ├── Active & Syncing
│   └── Last sync < 1 hour
├── Warning (Yellow)
│   ├── Sync delayed
│   └── Last sync > 1 day
├── Error (Red)
│   ├── Authentication failed
│   └── Sync errors
└── Disconnected (Gray)
    └── No active connection
```

### Connection Information Structure

```
GitHub Connection
├── Status (Active/Error/Disconnected)
├── Metadata
│   ├── Account name
│   ├── Repositories connected
│   └── Permissions granted
├── Sync Information
│   ├── Last sync time
│   ├── Records synced
│   └── Next sync scheduled
└── Actions
    ├── Reconnect
    ├── Sync now
    └── Disconnect
```

---

## Data Relationship Model

### Entity-Centric View
How users understand connections between items:

```
Central Entity: "User Authentication Feature"
├── Related Issues
│   ├── Bug: Login fails with SSO
│   ├── Feature: Add 2FA support
│   └── Task: Update auth documentation
├── Related Code
│   ├── PR: Implement OAuth flow
│   ├── Commit: Fix token refresh
│   └── File: auth/controller.js
├── Related Docs
│   ├── Notion: Authentication Guide
│   ├── README: Setup instructions
│   └── Wiki: Security policies
└── Related People
    ├── Author: John (implemented)
    ├── Reviewer: Sarah (approved)
    └── Reporter: Mike (found bugs)
```

### Timeline-Centric View
How events are organized temporally:

```
Timeline: "Project Alpha Launch"
├── 3 Months Ago
│   ├── Project kickoff (Notion)
│   └── Initial requirements (Jira)
├── 2 Months Ago
│   ├── First PR opened (GitHub)
│   └── Design review (Notion)
├── 1 Month Ago
│   ├── Beta testing begins (Jira)
│   └── Bug reports filed (GitHub)
├── 1 Week Ago
│   ├── Final fixes merged (GitHub)
│   └── Documentation complete (Notion)
└── Today
    └── Launch announcement (Slack)
```

---

## Mental Models

### How Users Think About Information

#### 1. **The Explorer Model**
"I want to explore and discover connections"
- Starts with broad search
- Follows interesting relationships
- Builds understanding through exploration

#### 2. **The Hunter Model**
"I know what I'm looking for"
- Specific search terms
- Direct navigation to results
- Quick in-and-out usage

#### 3. **The Monitor Model**
"I want to stay informed"
- Regular status checks
- Timeline reviews
- Change notifications

#### 4. **The Analyzer Model**
"I need to understand impact"
- Relationship analysis
- Dependency tracking
- Cause-and-effect investigation

---

## Information Scent

### Strong Scent Indicators
Elements that help users know they're on the right path:

1. **Breadcrumbs**
   ```
   Home > Search > "authentication" > GitHub Issue #123
   ```

2. **Context Badges**
   ```
   [GitHub] [Issue] [Bug] [High Priority] [Assigned to You]
   ```

3. **Relationship Indicators**
   ```
   Related to: PR #456, Notion:AuthGuide, Jira:PROJ-789
   ```

4. **Temporal Context**
   ```
   Created 2 weeks ago | Updated yesterday | Due in 3 days
   ```

### Weak Scent Problems to Avoid
- Unclear connection between items
- Missing source attribution
- No temporal context
- Ambiguous relationships

---

## Information Density Levels

### Level 1: Overview (Low Density)
Dashboard view with key metrics and status:
- 3-5 key metrics
- Visual status indicators
- Recent activity summary
- Quick actions

### Level 2: Browse (Medium Density)
Search results and connection lists:
- 10-20 items per page
- Essential metadata visible
- Sorting and filtering options
- Preview on hover

### Level 3: Detail (High Density)
Individual item view:
- Complete information
- All relationships shown
- Full timeline
- All available actions

---

## Findability Principles

### 1. **Multiple Access Paths**
Users can find the same information through:
- Direct search
- Navigation browse
- Relationship following
- Timeline exploration
- Recent activity

### 2. **Consistent Patterns**
Similar information organized similarly:
- All connections managed same way
- All searches work identically
- All timelines follow same structure

### 3. **Progressive Disclosure**
Information revealed as needed:
- Summary first
- Details on demand
- Advanced options hidden initially
- Related items expandable

### 4. **Context Preservation**
Users maintain context while navigating:
- Breadcrumb trails
- Back navigation preserves state
- Search context maintained
- Filters persist appropriately

---

## Information Architecture Patterns

### Hub and Spoke
Connections page as hub, individual integrations as spokes:
```
Connections Hub
├── GitHub Spoke (details, settings, status)
├── Notion Spoke (details, settings, status)
└── Jira Spoke (details, settings, status)
```

### Faceted Search
Multiple dimensions for filtering:
```
Search Facets
├── Source (GitHub, Notion, Jira)
├── Type (Issue, Doc, Code)
├── Time (Today, Week, Month)
├── Author (Team member)
└── Status (Open, Closed, Active)
```

### Card-Based Layout
Information chunks as cards:
- Integration cards (connection status)
- Search result cards (previews)
- Activity cards (timeline events)
- Entity cards (people, projects)

---

## Wayfinding Support

### Orientation Cues
Help users know where they are:
- Page titles reflect location
- Active navigation highlighted
- Breadcrumbs show path
- Project context always visible

### Navigation Aids
Help users get where they're going:
- Search from anywhere
- Quick project switcher
- Recent items menu
- Favorite/bookmarked searches

### Recovery Paths
Help users when they're lost:
- Home always accessible
- Clear back navigation
- Search history
- "Start over" options

---

## Mobile Information Architecture

### Simplified Hierarchy
Mobile-optimized structure:
```
Mobile Atlas
├── Search (primary action)
├── Recent (quick access)
├── Connections (status only)
└── Menu (everything else)
```

### Touch-Optimized Organization
- Larger tap targets
- Swipe gestures for navigation
- Collapsed sections by default
- Bottom navigation for thumb reach

### Progressive Enhancement
- Core features on mobile
- Advanced features on desktop
- Responsive information density
- Platform-appropriate interactions