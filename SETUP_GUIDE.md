# 🚀 AuditFlow AI - Setup & Testing Guide

## ✅ What's Complete

You now have a fully functional accounting automation system with:

- ✅ **Module 1-4:** Project Setup, Authentication, File Upload, Document Parser
- ✅ **Module 5:** Master Data Management (Vendors, Customers, SKUs)
- ✅ **Module 6:** PO ↔ Invoice Matching
- ✅ **Module 7:** Invoice ↔ Payment Matching
- ✅ **Module 8:** GST Reconciliation
- ✅ **Dashboard:** Real-time metrics and quick actions

---

## 📋 Prerequisites

1. **Node.js** (v18 or higher)
2. **PostgreSQL** (v16 recommended)
3. **Redis** (for background job processing)
4. **pnpm** (package manager)

---

## 🛠️ Setup Instructions

### Step 1: Install Dependencies

```bash
cd /Users/apple/auditflow

# Enable pnpm if not already done
corepack enable
corepack prepare pnpm@8.15.0 --activate

# Install all dependencies
pnpm install
```

### Step 2: Set Up Database

**Option A: Using Docker (Recommended)**

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis
```

**Option B: Local PostgreSQL**

```bash
# Create database
createdb auditflow
```

### Step 3: Configure Environment Variables

Create environment files:

**Backend: `/Users/apple/auditflow/apps/api/.env`**

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/auditflow?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production-min-32-chars"

# Anthropic API (for AI document extraction)
ANTHROPIC_API_KEY="your-anthropic-api-key"

# File Storage (S3/MinIO)
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_S3_BUCKET="auditflow-uploads"
AWS_S3_ENDPOINT="http://localhost:9000"  # For MinIO local
# For AWS S3, remove AWS_S3_ENDPOINT

# Server
API_PORT=4000
API_HOST=0.0.0.0
CORS_ORIGIN=http://localhost:3000

# Environment
NODE_ENV=development
```

**Frontend: `/Users/apple/auditflow/apps/web/.env.local`**

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Step 4: Run Database Migrations

```bash
cd apps/api
pnpm prisma migrate dev
pnpm prisma generate
```

### Step 5: Start Redis

**Using Docker:**
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

**Using Homebrew (macOS):**
```bash
brew install redis
brew services start redis
```

### Step 6: Start the Application

Open **two terminal windows**:

**Terminal 1 - API Server:**
```bash
cd /Users/apple/auditflow
pnpm --filter @auditflow/api dev
```

You should see:
```
🚀 API server running on http://0.0.0.0:4000
📊 Health check: http://0.0.0.0:4000/api/health
⚙️  Document processing worker started
🔗 PO-Invoice matching worker started
```

**Terminal 2 - Web Application:**
```bash
cd /Users/apple/auditflow
pnpm --filter @auditflow/web dev
```

You should see:
```
▲ Next.js 14.x.x
- Local: http://localhost:3000
```

---

## 🌐 Access the Application

### **Main URL:**
```
http://localhost:3000
```

### **First Time Setup:**

1. **Register an account:**
   - Go to: http://localhost:3000/register
   - Enter your details (organization name, email, password)
   - Click "Create Account"

2. **Login:**
   - Go to: http://localhost:3000/login
   - Use your email and password
   - You'll be redirected to the dashboard

---

## 📊 Quick Test Workflow

### Test 1: Master Data Setup

1. **Add Vendors:**
   - Navigate to http://localhost:3000/vendors
   - Click "Add Vendor"
   - Fill in vendor details with GSTIN
   - Save

2. **Add Customers:**
   - Navigate to http://localhost:3000/customers
   - Click "Add Customer"
   - Fill in customer details
   - Save

3. **Add SKUs:**
   - Navigate to http://localhost:3000/skus
   - Click "Add SKU"
   - Fill in product details with HSN code
   - Save

### Test 2: Document Upload & Processing

1. **Upload a Purchase Invoice:**
   - Navigate to http://localhost:3000/uploads
   - Click "Upload Document"
   - Select a PDF invoice or Excel file
   - Choose document type: "Purchase Invoice"
   - Upload

2. **Watch AI Processing:**
   - The document worker will process it automatically
   - AI extracts: vendor, line items, amounts, GST
   - Status updates: PENDING → PROCESSING → COMPLETED

3. **View Extracted Data:**
   - Click on the uploaded document
   - Review extracted fields
   - Correct any errors if needed

### Test 3: PO-Invoice Matching

1. **Upload Purchase Orders:**
   - Upload PO documents
   - AI extracts PO details

2. **Auto-Match:**
   - Background worker automatically matches invoices to POs
   - Navigate to http://localhost:3000/matches
   - See matched invoices with confidence scores

3. **Review Exceptions:**
   - View invoices that need manual review
   - Check discrepancies (quantity, price, amount)

### Test 4: Payment Reconciliation

1. **Upload Bank Statement:**
   - Upload bank statement (Excel/PDF)
   - AI extracts transactions

2. **Auto-Match Payments:**
   - System matches bank transactions to invoices
   - Reference number matching
   - Fuzzy amount matching (±₹10)

3. **Review Payment Status:**
   - See invoice payment status: PAID/PARTIALLY_PAID
   - View outstanding amounts

### Test 5: GST Reconciliation

1. **Upload GSTR-2A/2B:**
   - Upload GST return file
   - AI extracts GST entries

2. **Reconcile:**
   - System matches GSTR entries with purchase invoices
   - Detects discrepancies
   - Calculates ITC status

3. **Review ITC Report:**
   - View ITC available vs claimed
   - See missing entries (both directions)
   - Export exception report

---

## 🔌 API Endpoints Reference

### Health Check
```bash
curl http://localhost:4000/api/health
```

### Authentication
```bash
# Register
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User","orgName":"Test Org"}'

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Master Data (Require Authentication)
```bash
# List Vendors
curl http://localhost:4000/api/vendors \
  -H "Cookie: token=YOUR_JWT_TOKEN"

# List Customers
curl http://localhost:4000/api/customers \
  -H "Cookie: token=YOUR_JWT_TOKEN"

# List SKUs
curl http://localhost:4000/api/skus \
  -H "Cookie: token=YOUR_JWT_TOKEN"
```

### Matches & Reconciliation
```bash
# PO-Invoice Matches
curl http://localhost:4000/api/po-invoice-matches \
  -H "Cookie: token=YOUR_JWT_TOKEN"

# Payment Matches
curl http://localhost:4000/api/payment-matches \
  -H "Cookie: token=YOUR_JWT_TOKEN"

# GST Matches
curl http://localhost:4000/api/gst-matches \
  -H "Cookie: token=YOUR_JWT_TOKEN"
```

---

## 🐛 Troubleshooting

### Database Connection Error
```bash
# Check if PostgreSQL is running
psql -U postgres -c "SELECT version();"

# Verify DATABASE_URL in .env
echo $DATABASE_URL
```

### Redis Connection Error
```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG
```

### API Server Won't Start
```bash
# Check if port 4000 is in use
lsof -i :4000

# Kill process if needed
kill -9 <PID>
```

### Web App Won't Start
```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill process if needed
kill -9 <PID>
```

### Document Processing Not Working
```bash
# Check Redis connection
redis-cli ping

# Check BullMQ dashboard (optional)
# Install: pnpm add -g bull-board
# Access: http://localhost:4000/admin/queues
```

### AI Extraction Failing
- Verify `ANTHROPIC_API_KEY` is set in `.env`
- Check API key has sufficient credits
- Check API logs: `apps/api/logs/`

---

## 📦 Technology Stack

**Backend:**
- Fastify (API server)
- Prisma ORM (PostgreSQL)
- BullMQ (job queue with Redis)
- Claude API (AI extraction)
- Zod (validation)

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Shadcn/ui components
- Lucide icons

**Infrastructure:**
- PostgreSQL 16 (database)
- Redis (job queue)
- S3/MinIO (file storage)

---

## 🎯 Next Steps

Once you've tested the system, you can:

1. **Add more modules:**
   - Module 9: Discount & Penalty Validator
   - Module 10: Vendor Ledger Confirmation
   - Module 11: Audit Trail & History
   - Module 15: Reports & Export

2. **Deploy to production:**
   - Set up production database
   - Configure S3 for file storage
   - Deploy API to cloud (Railway, Render, AWS)
   - Deploy web app to Vercel

3. **Customize for your needs:**
   - Add custom SKU categories
   - Configure discount terms
   - Set up email notifications
   - Add custom reports

---

## 🎉 Success!

If you see the dashboard with live statistics, **congratulations!** Your AuditFlow AI system is up and running.

**Dashboard URL:** http://localhost:3000/dashboard

The dashboard shows:
- Documents uploaded and processed
- PO-Invoice match statistics
- Payment reconciliation status
- GST reconciliation health
- Master data summary
- Quick actions for common tasks

---

## 📚 Documentation

- **Module Completion Docs:**
  - MODULE_5_COMPLETE.md - Master Data Management
  - MODULE_6_COMPLETE.md - PO-Invoice Matching
  - MODULE_7_COMPLETE.md - Payment Matching
  - MODULE_8_COMPLETE.md - GST Reconciliation

- **Database Schema:** `apps/api/prisma/schema.prisma`
- **API Routes:** `apps/api/src/routes/`
- **Services:** `apps/api/src/services/`

---

## 🆘 Need Help?

If you encounter any issues:
1. Check the troubleshooting section above
2. Review error logs in terminal
3. Check browser console (F12) for frontend errors
4. Review API logs: `apps/api/logs/`

**Your automated accounting system is ready to use! 🚀**
