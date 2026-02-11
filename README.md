# AuditFlow AI

Automated Accounting & Audit System for Indian businesses.

## Features

- **Purchase-side 3-Way Matching**: PO ↔ Purchase Invoice ↔ Bank Payment + GST Input Verification
- **Sales-side 2-Way Matching**: Sales Invoice ↔ Customer Payment + GST Output Verification
- **Vendor Ledger Confirmation**: Automated monthly/weekly vendor reconciliation
- **Customer Ledger Confirmation**: Automated customer ledger sharing + payment reminders
- **Inventory Intelligence**: SKU-level tracking with discrepancy detection
- **Discount/Penalty Audit**: Business terms validation

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Fastify, Node.js
- **Database**: PostgreSQL 16 with Prisma ORM
- **Queue**: BullMQ with Redis
- **Storage**: MinIO (S3-compatible)
- **AI**: Claude API (Anthropic)
- **Deployment**: Docker Compose

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- Docker & Docker Compose
- Claude API key (from Anthropic)

### Installation

1. **Clone the repository** (or you're already here!)

2. **Install dependencies**

```bash
pnpm install
```

3. **Set up environment variables**

```bash
# Copy environment files
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Edit .env files and add your credentials:
# - DATABASE_URL
# - REDIS_URL
# - ANTHROPIC_API_KEY (required for AI extraction)
# - SMTP credentials (for email features)
```

4. **Start Docker services**

```bash
pnpm docker:up
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379
- MinIO on ports 9000 (API) and 9001 (Console)

5. **Generate Prisma Client and run migrations**

```bash
pnpm db:generate
pnpm db:migrate
```

6. **Start the development servers**

```bash
pnpm dev
```

This starts:
- API server on http://localhost:4000
- Web app on http://localhost:3000

### Access the Application

- **Web UI**: http://localhost:3000
- **API**: http://localhost:4000
- **API Health**: http://localhost:4000/api/health
- **MinIO Console**: http://localhost:9001 (login: minioadmin / minioadmin)
- **Prisma Studio**: `pnpm db:studio` (opens at http://localhost:5555)

## Project Structure

```
auditflow/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Fastify backend
├── packages/
│   └── shared/       # Shared types & utilities
├── docker-compose.yml
└── turbo.json
```

## Available Scripts

### Root

- `pnpm dev` - Start all apps in development mode
- `pnpm build` - Build all apps
- `pnpm docker:up` - Start Docker services
- `pnpm docker:down` - Stop Docker services
- `pnpm db:migrate` - Run database migrations
- `pnpm db:studio` - Open Prisma Studio

### Individual Apps

```bash
cd apps/web
pnpm dev          # Start Next.js dev server
pnpm build        # Build for production
pnpm start        # Start production server
```

```bash
cd apps/api
pnpm dev          # Start Fastify with hot reload
pnpm build        # Build TypeScript
pnpm start        # Start production server
```

## Development Workflow

1. **Module 1 (Foundation)** - ✅ Complete
   - Monorepo setup
   - Database schema
   - Docker infrastructure
   - Basic auth & file upload

2. **Module 2 (Document Processing)** - Next
   - PDF/Excel/Image parsing
   - AI extraction with Claude
   - Document classification

3. **Modules 3-7** - See architecture document

## Environment Variables Reference

See `.env.example` for a complete list of required environment variables.

**Required for development:**
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `ANTHROPIC_API_KEY` - Claude API key

**Optional (for production):**
- SMTP settings (for email features)
- S3 settings (for production storage)

## Database Management

```bash
# Generate Prisma Client
pnpm db:generate

# Push schema to database (development)
pnpm db:push

# Create a migration
pnpm db:migrate

# Open Prisma Studio
pnpm db:studio

# Reset database (WARNING: deletes all data)
cd apps/api && pnpm prisma migrate reset
```

## Deployment

### Using Docker Compose (Recommended)

```bash
# Build images
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### Manual Deployment

1. Build the applications:
```bash
pnpm build
```

2. Set production environment variables

3. Run migrations:
```bash
pnpm db:migrate
```

4. Start the applications:
```bash
cd apps/api && pnpm start
cd apps/web && pnpm start
```

## License

Proprietary - All rights reserved

## Support

For issues and questions, please refer to the architecture document or contact the development team.
