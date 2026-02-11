# 🚀 AuditFlow - AI-Powered Accounting & Audit Automation Platform

An intelligent accounting reconciliation and audit automation system built for Indian businesses, powered by Claude AI (Anthropic).

[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748)](https://www.prisma.io/)
[![Claude AI](https://img.shields.io/badge/Claude-Sonnet_4.5-orange)](https://www.anthropic.com/)

## ✨ Features

### 🤖 AI-Powered Automation
- **AI Chat Interface** - Natural language queries for all accounting operations
- **Document Extraction** - Automatic data extraction from invoices, POs, and bank statements
- **Smart Reconciliation** - AI-powered matching of invoices, POs, and payments
- **Anomaly Detection** - Identify duplicate payments, suspicious transactions, and fraud patterns
- **25+ AI Tools** - Comprehensive tool calling for analytics, reconciliation, and reporting

### 📊 13 Reconciliation Modules
1. **Purchase Order Management** - Track and manage POs
2. **Purchase Invoice Processing** - Automated invoice data entry
3. **Sales Invoice Management** - Customer billing and invoicing
4. **Bank Reconciliation** - Match bank transactions with invoices
5. **GST Reconciliation** - GSTR-2A vs purchase register matching
6. **Vendor Ledger Confirmation** - Automated vendor statement reconciliation
7. **Payment Reminders** - Smart overdue payment notifications
8. **Inventory Reconciliation** - Stock discrepancy detection
9. **Credit/Debit Notes** - Adjustments and corrections tracking
10. **Discount Audits** - Vendor discount validation
11. **SKU Master Management** - Product catalog maintenance
12. **Customer Management** - Customer database with aging analysis
13. **Vendor Management** - Supplier database with payment tracking

### 🎯 Key Capabilities
- **Multi-tenant Architecture** - Support multiple organizations
- **Role-based Access Control** - Admin, Accountant, Viewer roles
- **Real-time Streaming** - Live AI responses via Server-Sent Events
- **File Upload & Processing** - Drag-and-drop document uploads with OCR
- **Advanced Analytics** - Aging analysis, GST liability, duplicate detection
- **Conversation History** - Persistent chat conversations
- **Side Panel Results** - Beautiful tables, charts, and JSON views

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- Next.js 16.1.6 (App Router + Turbopack)
- React 19.2.4
- TypeScript
- Tailwind CSS + Shadcn/ui
- Zustand (State Management)

**Backend:**
- Fastify (High-performance Node.js framework)
- TypeScript
- Prisma ORM
- PostgreSQL
- Redis + BullMQ (Job queues)

**AI & ML:**
- Claude Sonnet 4.5 (Anthropic)
- 25+ specialized tools for accounting operations
- Streaming responses with tool calling

**Infrastructure:**
- Docker & Docker Compose
- AWS S3 (File storage)
- GitHub Actions (CI/CD ready)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- Redis 7+
- pnpm (recommended) or npm
- Anthropic API key ([Get one here](https://console.anthropic.com/))

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/auditflow.git
cd auditflow
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Setup environment variables**

**API (.env):**
```bash
cd apps/api
cp .env.example .env
# Edit .env with your configurations
```

**Web (.env):**
```bash
cd apps/web
cp .env.example .env
```

4. **Setup database**
```bash
cd apps/api

# Run migrations
pnpm prisma migrate deploy

# Seed database with demo data
pnpm prisma db seed
```

5. **Start development servers**
```bash
# Terminal 1 - API Server
cd apps/api
pnpm dev

# Terminal 2 - Web App
cd apps/web
pnpm dev
```

6. **Access the application**
- Web App: http://localhost:3000
- API: http://localhost:4000
- API Docs: http://localhost:4000/api/health

### Demo Credentials
```
Email: demo@auditflow.com
Password: Password123
```

## 📖 Usage

### AI Chat Interface

Access the AI chat at http://localhost:3000/chat

**Example Queries:**
```
"Show me all unpaid invoices from last month"
"What's my GST liability for January 2025?"
"Find duplicate payments in the last 30 days"
"Reconcile invoice INV-2025-001 with PO-2024-456"
"Generate vendor ledger for ABC Electronics"
"Extract data from this invoice" (with file upload)
```

### API Endpoints

**Authentication:**
```bash
POST /api/auth/login
POST /api/auth/register
```

**AI Chat:**
```bash
POST /api/chat/conversations
GET  /api/chat/conversations
GET  /api/chat/stream
POST /api/chat/upload
```

**Document Processing:**
```bash
POST /api/ai-demo/extract-invoice
POST /api/ai-demo/extract-po
POST /api/ai-demo/extract-bank-statement
POST /api/ai-demo/process-and-save-invoice
```

**Reconciliation:**
```bash
GET  /api/po-invoice-matches
POST /api/po-invoice-matches/suggest
GET  /api/payment-matches
GET  /api/gst-matches
```

See [API Documentation](./AI_FEATURES_GUIDE.md) for complete API reference.

## 🤖 AI Features

### 25+ Specialized Tools

**Data Query Tools:**
- query_vendors, query_customers
- query_purchase_invoices, query_purchase_orders
- query_bank_transactions, query_inventory

**Reconciliation Tools:**
- reconcile_po_invoice, find_po_matches
- reconcile_invoice_payment, reconcile_gst
- generate_vendor_ledger, reconcile_inventory

**Document Processing:**
- extract_invoice_from_file
- extract_po_from_file
- extract_bank_statement_from_file

**Analytics:**
- calculate_gst_liability
- find_duplicate_payments
- vendor_aging_analysis, customer_aging_analysis
- get_dashboard_summary

**Actions:**
- create_vendor, save_extracted_invoice
- update_invoice_status
- send_payment_reminder
- send_vendor_ledger_confirmation

### Document Extraction

Upload any invoice, PO, or bank statement and get:
- Structured JSON data extraction
- Arithmetic verification
- Confidence scoring
- Automatic vendor creation
- Line item extraction
- GST breakdown

## 📁 Project Structure

```
auditflow/
├── apps/
│   ├── api/                    # Backend API (Fastify)
│   │   ├── prisma/            # Database schema & migrations
│   │   ├── src/
│   │   │   ├── routes/        # API routes
│   │   │   ├── services/      # Business logic
│   │   │   │   ├── chat-orchestrator.ts  # AI chat engine
│   │   │   │   ├── chat-tools.ts         # Tool definitions
│   │   │   │   ├── chat-tool-executor.ts # Tool implementations
│   │   │   │   ├── ai-extractor.ts       # Document extraction
│   │   │   │   ├── po-invoice-matcher.ts # PO-Invoice matching
│   │   │   │   └── ...
│   │   │   ├── workers/       # Background jobs
│   │   │   └── lib/           # Utilities
│   │   └── package.json
│   │
│   └── web/                    # Frontend (Next.js)
│       ├── app/               # App router pages
│       │   ├── (dashboard)/   # Dashboard routes
│       │   │   ├── chat/      # AI Chat interface
│       │   │   ├── purchases/ # Purchase management
│       │   │   ├── sales/     # Sales management
│       │   │   └── ...
│       │   └── (auth)/        # Auth pages
│       ├── components/        # React components
│       │   ├── chat/         # Chat components
│       │   ├── ui/           # Shadcn/ui components
│       │   └── layout/       # Layout components
│       ├── lib/              # Utilities
│       │   ├── chat-store.ts # Chat state management
│       │   └── chat-api.ts   # Chat API client
│       └── package.json
│
├── packages/                  # Shared packages
├── AI_FEATURES_GUIDE.md      # Complete AI features documentation
├── SAMPLE_INVOICE.txt        # Sample invoice for testing
├── pnpm-workspace.yaml       # Monorepo configuration
└── README.md                 # This file
```

## 🔧 Configuration

### Environment Variables

**API (`apps/api/.env`):**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/auditflow"
JWT_SECRET="your-secret-key"
ANTHROPIC_API_KEY="sk-ant-api03-your-key"
REDIS_HOST="localhost"
AWS_S3_BUCKET="your-bucket"
```

**Web (`apps/web/.env`):**
```env
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

### Database Schema

The system uses PostgreSQL with Prisma ORM. Key models:
- Organization (Multi-tenant)
- User (RBAC)
- Vendor, Customer, SKU
- PurchaseOrder, PurchaseInvoice, SalesInvoice
- BankTransaction, BankStatement
- GSTReturn, CreditDebitNote
- ChatConversation, ChatMessage

Run migrations:
```bash
cd apps/api
pnpm prisma migrate deploy
```

## 🧪 Testing

### Test AI Extraction

```bash
# Login
TOKEN=$(curl -s -X POST 'http://localhost:4000/api/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@auditflow.com","password":"Password123"}' \
  | jq -r '.data.token')

# Test invoice extraction
curl -X POST 'http://localhost:4000/api/ai-demo/extract-invoice' \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"documentText":"TAX INVOICE\n\nABC Electronics..."}'
```

### Test Chat

Visit http://localhost:3000/chat and try:
- "Show me unpaid invoices"
- Upload an invoice document
- "What's my GST liability?"

## 🚢 Deployment

### Docker Deployment

```bash
# Build and run
docker-compose up -d

# Check logs
docker-compose logs -f
```

### Manual Deployment

1. Build frontend:
```bash
cd apps/web
pnpm build
```

2. Run migrations:
```bash
cd apps/api
pnpm prisma migrate deploy
```

3. Start services:
```bash
# API
cd apps/api
pnpm start

# Web (using a process manager like PM2)
cd apps/web
pm2 start npm --name "auditflow-web" -- start
```

## 📊 Cost Estimates

### Claude API Costs

**Claude Sonnet 4.5 Pricing:**
- Input: $3 per million tokens
- Output: $15 per million tokens

**Typical Usage:**
- Invoice extraction: ~2000 input + 500 output tokens = $0.01
- Chat query: ~1000 input + 200 output tokens = $0.006
- **1000 invoices/month**: ~$10
- **1000 chat queries/month**: ~$6

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Anthropic Claude](https://www.anthropic.com/) - AI-powered document extraction and chat
- [Next.js](https://nextjs.org/) - React framework
- [Fastify](https://www.fastify.io/) - Fast web framework
- [Prisma](https://www.prisma.io/) - Next-generation ORM
- [Shadcn/ui](https://ui.shadcn.com/) - Beautiful UI components

## 📞 Support

For questions and support:
- Documentation: [AI_FEATURES_GUIDE.md](./AI_FEATURES_GUIDE.md)
- Issues: [GitHub Issues](https://github.com/yourusername/auditflow/issues)
- Email: support@auditflow.com

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] Excel/CSV export
- [ ] Advanced reporting dashboards
- [ ] Multi-language support
- [ ] WhatsApp bot integration
- [ ] OCR improvements
- [ ] Real-time collaboration
- [ ] Audit trail and compliance reports

---

**Built with ❤️ for Indian Accountants**

**Powered by Claude AI | Next.js | Prisma | PostgreSQL**
