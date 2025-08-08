# Integration Platform MVP

A production-ready integration platform that leverages Next.js 14+ App Router, Nango for multi-system integration, and Zep Cloud for intelligent document storage and event recording.

## Features

- 🔗 Multi-system integration (GitHub, Notion, Jira)
- 🔄 Automated data synchronization
- 📊 Event recording and storage
- 🔐 Secure webhook handling
- 📈 Health monitoring
- 🎯 Rate limiting and security middleware

## Quick Start

### Prerequisites

- Node.js 18.18 or later
- PostgreSQL (optional but recommended)
- Nango account ([app.nango.dev](https://app.nango.dev))
- Zep account ([app.getzep.com](https://app.getzep.com))

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual API keys:
- `NANGO_SECRET_KEY` - From [Nango Environment Settings](https://app.nango.dev/environment-settings)
- `NANGO_WEBHOOK_SECRET` - Generate with: `openssl rand -hex 32`
- `ZEP_API_KEY` - From Zep dashboard
- `ZEP_PROJECT_ID` - Your Zep project ID
- `DATABASE_URL` - PostgreSQL connection string (optional)

3. Set up the database (optional):
```bash
npx prisma generate
npx prisma migrate dev
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## API Endpoints

### Health & Monitoring
- `GET /api/health` - System health check

### Authentication
- `POST /api/auth/session` - Create Nango session token

### Webhooks
- `POST /api/webhooks/nango` - Nango webhook receiver
- `HEAD /api/webhooks/nango` - Webhook validation

### Sync Management
- `POST /api/sync` - Trigger sync for provider
- `GET /api/sync?syncId=...` - Check sync status

### Connection Management
- `GET /api/connections` - List all connections
- `POST /api/connections` - Create new connection
- `GET /api/connections/[id]` - Get connection details
- `DELETE /api/connections/[id]` - Remove connection
- `PATCH /api/connections/[id]` - Update connection

## Project Structure

```
integration-platform/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes
│   ├── components/           # React components
│   ├── connections/          # Connection management UI
│   └── page.tsx              # Landing page
├── lib/                      # Core libraries
│   ├── nango/                # Nango integration
│   ├── zep/                  # Zep integration
│   ├── db/                   # Database utilities
│   ├── errors/               # Error handling
│   └── utils/                # Utilities
├── prisma/                   # Database schema
└── middleware.ts             # Security middleware
```

## Security Features

- Webhook signature verification
- Rate limiting (100 requests/minute)
- Security headers (CSP, XSS protection)
- Input validation with Zod
- Environment variable validation

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Building for Production
```bash
npm run build
npm start
```

## Webhook Configuration

Configure your Nango webhook URL:
```
https://your-domain.com/api/webhooks/nango
```

For local testing, use ngrok:
```bash
ngrok http 3000
```

## Troubleshooting

### Environment Variables
Validate required variables:
```bash
node scripts/validate-env.js
```

### Database Connection
Test database connection:
```bash
npx prisma db push
```

## License

MIT
