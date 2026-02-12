# 🎯 START TESTING HERE

## ✅ System Status: READY

All servers running, test account created, all endpoints verified.

---

## 🚀 Quick Start (3 Steps)

### 1. Login
Open: **http://localhost:3000/login**

```
Email:    test@example.com
Password: Test1234
```

### 2. Open Chat
After login, press **Cmd+K** or click "AI Chat" in sidebar

### 3. Start Testing
Try these in order:

**Test 1: Send Message** (30 seconds)
```
Type: "Show me all unpaid invoices"
Press: Enter
```

**Test 2: Upload File** (2 minutes)
```
1. Click paperclip icon 📎
2. Select any PDF invoice
3. Type: "Process this invoice"
4. Send
```

**Test 3: Browse Templates** (1 minute)
```
1. Click "Browse Templates"
2. Click any workflow
3. Send the auto-filled prompt
```

---

## 📚 Full Testing Guides

For comprehensive testing, see:

1. **TESTING_INSTRUCTIONS.md** - Step-by-step testing guide (40-50 min)
2. **CHAT_UI_TEST_GUIDE.md** - Detailed test scenarios (80+ tests)
3. **CHAT_UI_STATUS.md** - System status and known issues

---

## 🎯 What You're Testing

### Core Features
- ✅ AI chat with streaming responses
- ✅ File upload & processing
- ✅ Document classification (25+ types)
- ✅ Data extraction (invoices, POs, bank statements)
- ✅ Rich message cards (6 types)
- ✅ Workflow templates (15 pre-configured)
- ✅ Mobile responsive design
- ✅ Batch file processing
- ✅ Dashboard widgets inline

### Tech Stack
- **Frontend:** React 19 + Next.js 16 App Router
- **Backend:** Fastify + Prisma
- **AI:** Claude Sonnet 4.5 via Anthropic API
- **Streaming:** Server-Sent Events (SSE)
- **Tools:** 25+ AI tools for data operations

---

## 🐛 If You See Errors

### Console Errors (Press F12 → Console)

**Normal (OK)** ✅
```
Tool call: classify_and_process_file
Processing file: invoice.pdf
Classification: PURCHASE_INVOICE (92%)
```

**Problems (Report)** ❌
```
TypeError: Cannot read property...
Failed to fetch
Module not found
```

### Common Issues

**Issue:** "Authentication required"
**Fix:** Make sure you're logged in at http://localhost:3000/login

**Issue:** File won't upload
**Check:**
- File size < 25MB?
- File type is PDF/Excel/Image?
- Backend running on port 4000?

**Issue:** No AI response
**Check:**
- Check backend logs for errors
- Verify ANTHROPIC_API_KEY is set in .env
- Check SSE connection in Network tab (EventSource)

---

## ✅ Test Checklist

Quick checklist for essential tests:

```
[ ] Login works
[ ] Chat interface loads without errors
[ ] Can send text messages
[ ] AI responds (streaming text appears)
[ ] File upload works
[ ] File processes and classifies
[ ] Extracted data displays in card
[ ] Workflow templates populate input
[ ] Mobile layout responsive
[ ] No critical console errors
```

---

## 📞 Need Help?

- Full status: See **CHAT_UI_STATUS.md**
- Detailed tests: See **CHAT_UI_TEST_GUIDE.md**
- API tests: Run `/tmp/quick_chat_test.sh`
- Endpoint tests: Run `/tmp/test_chat_endpoints.sh`

---

## 🎉 Let's Go!

**Start here:**
👉 http://localhost:3000/login

**Time estimate:** 5-10 minutes for quick test, 40-50 for full suite

Good luck! 🚀
