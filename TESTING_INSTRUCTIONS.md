# 🧪 Chat UI Testing - Quick Start Guide

## ✅ Prerequisites

Both servers are running:
- ✅ Frontend: http://localhost:3000
- ✅ Backend: http://localhost:4000
- ✅ Test account created
- ✅ All endpoints verified

## 🚀 Step-by-Step Testing

### Step 1: Login (2 minutes)

1. Open browser: **http://localhost:3000/login**
2. Enter credentials:
   - **Email:** test@example.com
   - **Password:** Test1234
3. Click "Sign In"
4. You should be redirected to `/dashboard`

### Step 2: Access Chat UI (1 minute)

**Method 1: Via Sidebar**
- Click "AI Chat" in the left sidebar (top item)

**Method 2: Keyboard Shortcut**
- Press **Cmd+K** (Mac) or **Ctrl+K** (Windows/Linux)

**Method 3: Direct URL**
- Navigate to: http://localhost:3000/chat

### Step 3: Basic Chat Test (5 minutes)

#### Test 3.1: Send First Message
1. You'll see "Start New Chat" button
2. Click it to create a conversation
3. Type: **"Show me all unpaid invoices"**
4. Press **Enter** or click **Send**

**Expected Results:**
- ✅ Your message appears (blue bubble, right side)
- ✅ AI responds with streaming text (gray bubble, left side)
- ✅ Conversation appears in left sidebar
- ✅ No console errors

#### Test 3.2: Quick Actions
1. Look for quick action chips below input
2. Click **"Show Unpaid Invoices"**
3. Input auto-fills with the prompt
4. Send the message

**Expected Results:**
- ✅ Prompt auto-populated
- ✅ AI responds appropriately

### Step 4: File Upload Test (10 minutes)

#### Test 4.1: Upload via Button
1. Click the **paperclip icon** (📎) next to input
2. Select a PDF invoice from your computer
3. Watch the progress bar
4. Type: **"Process this invoice"**
5. Click Send

**Expected Results:**
- ✅ File chip appears with progress (0% → 100%)
- ✅ Processing stages show:
  - ⏳ Uploading...
  - ⏳ Parsing...
  - ⏳ Classifying...
  - ✓ Classified: PURCHASE_INVOICE (XX%)
- ✅ Extracted data card appears
- ✅ Confidence badge shows
- ✅ Invoice details visible

#### Test 4.2: Drag & Drop (Desktop Only)
1. Find a PDF invoice on your computer
2. Drag it over the chat window
3. Blue dashed border should appear
4. Drop the file
5. Type a message and send

**Expected Results:**
- ✅ Drop zone overlay appears
- ✅ File attached after drop
- ✅ Same processing as Test 4.1

### Step 5: Workflow Templates (5 minutes)

1. Click **"Browse Templates"** button
2. Template browser opens with 15 workflows
3. Search for "invoice" in search box
4. Results filter to invoice-related workflows
5. Click **"Upload & Process Invoice"** card
6. Observe chat input auto-fills
7. Press Enter to send

**Expected Results:**
- ✅ Template browser opens
- ✅ Search works instantly
- ✅ Template populates input
- ✅ AI responds with detailed workflow

### Step 6: Rich Message Cards (5 minutes)

Upload an invoice and watch for these card types:

#### ExtractedDataCard
- Shows invoice number, vendor, date, amount
- Confidence badge (e.g., "94% Confidence")
- Arithmetic verification badge
- Action buttons

#### FileUploadCard
- Real-time progress bar
- Stage indicators
- Document type badge

#### ConfirmationCard (if AI asks)
- "Shall I save this?" message
- [Yes, Save It] [No, Edit First] buttons
- Click either to respond

**Expected Results:**
- ✅ All cards render correctly
- ✅ Buttons are clickable
- ✅ Data is readable

### Step 7: Mobile Responsive (5 minutes)

1. Open DevTools (F12)
2. Click "Toggle device toolbar" (Ctrl+Shift+M)
3. Select "iPhone 12 Pro"
4. Observe layout changes:
   - Conversation list hidden
   - Hamburger menu appears
   - Quick actions scroll horizontally
5. Click hamburger menu
6. Conversation list slides in from left

**Expected Results:**
- ✅ Mobile layout active
- ✅ Hamburger menu works
- ✅ All features accessible
- ✅ No broken layouts

### Step 8: Performance Test (5 minutes)

#### Test 8.1: Multiple Messages
1. Send 10 messages rapidly
2. Observe scrolling smoothness
3. Watch for lag or jank
4. Check auto-scroll to bottom

**Expected Results:**
- ✅ Smooth scrolling
- ✅ No lag
- ✅ Auto-scrolls correctly
- ✅ All messages render

#### Test 8.2: Multiple Files
1. Upload 3 PDFs simultaneously
2. Watch progress indicators
3. All should process sequentially
4. Check memory usage (DevTools → Memory)

**Expected Results:**
- ✅ All files process
- ✅ No errors
- ✅ Memory stable

### Step 9: Error Handling (3 minutes)

#### Test 9.1: Network Offline
1. Open DevTools → Network tab
2. Set throttling to "Offline"
3. Try sending a message
4. Error should appear

**Expected Results:**
- ✅ Graceful error message
- ✅ Toast notification
- ✅ No crash

#### Test 9.2: Invalid File
1. Try uploading a .exe or .zip
2. Should reject with error

**Expected Results:**
- ✅ Validation error
- ✅ Upload rejected

## 📊 Test Checklist

After completing all tests, fill out this checklist:

```
[ ] ✅ Login works
[ ] ✅ Chat interface loads
[ ] ✅ Can send text messages
[ ] ✅ AI responds with streaming
[ ] ✅ File upload works (button)
[ ] ✅ File upload works (drag-drop)
[ ] ✅ File processing shows stages
[ ] ✅ Classification results appear
[ ] ✅ Extracted data cards display
[ ] ✅ Workflow templates work
[ ] ✅ Search templates works
[ ] ✅ Quick actions populate input
[ ] ✅ Mobile layout responsive
[ ] ✅ Conversation list works
[ ] ✅ Side panel opens (if applicable)
[ ] ✅ No critical console errors
[ ] ✅ Performance acceptable (smooth)
[ ] ✅ Error handling graceful
```

## 🐛 Reporting Issues

If you find issues, note:
1. **Exact steps to reproduce**
2. **Error message** (from console)
3. **Screenshot** (if UI issue)
4. **Browser & version**
5. **Expected vs actual behavior**

## 🎯 Expected Console Logs

### Normal Logs (OK) ✅
```
Tool call: classify_and_process_file
SSE connection established
Processing file: invoice.pdf
Classification: PURCHASE_INVOICE (92%)
```

### Error Logs (NOT OK) ❌
```
TypeError: Cannot read property 'X' of undefined
Failed to fetch
Module not found
Uncaught ReferenceError
```

## 📞 Quick Reference

### Test Account
- Email: test@example.com
- Password: Test1234

### URLs
- Login: http://localhost:3000/login
- Chat: http://localhost:3000/chat
- Dashboard: http://localhost:3000/dashboard

### Keyboard Shortcuts
- **Cmd+K / Ctrl+K**: Jump to chat
- **Enter**: Send message
- **Shift+Enter**: New line in input
- **Esc**: Close dialogs

### Sample Test Files
Find sample invoices in: `/Users/apple/auditflow/test-files/` (if exists)
Or use any PDF invoice you have

## ✅ Success Criteria

### Must Pass
- [ ] All basic chat features work
- [ ] File upload completes successfully
- [ ] AI processes files and classifies them
- [ ] Rich cards display correctly
- [ ] No critical errors in console
- [ ] Mobile responsive works

### Performance
- [ ] Streaming response < 100ms latency
- [ ] File upload shows real-time progress
- [ ] 20+ messages with no lag
- [ ] Conversation switch < 500ms

### UX
- [ ] All buttons clickable
- [ ] Loading states visible
- [ ] Error messages helpful
- [ ] Mobile navigation works
- [ ] Keyboard shortcuts work

## 🎉 Ready to Test!

Start with **Step 1** above and work through all tests.

**Estimated Time:** 40-50 minutes for full test suite

Good luck! 🚀
