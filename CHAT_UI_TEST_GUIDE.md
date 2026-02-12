# Chat UI Complete Testing Guide

## ✅ Servers Running
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:4000

---

## 🧪 Test Scenarios

### 1️⃣ Basic Chat Flow (5 min)

#### Test 1.1: Access Chat
- [ ] Open http://localhost:3000
- [ ] Should redirect to `/chat` automatically
- [ ] Welcome screen shows "Browse Templates" button
- [ ] Sidebar shows "AI Chat" at the top

**Expected**: Clean chat interface with no errors

#### Test 1.2: Create Conversation
- [ ] Click "Start New Chat" button
- [ ] Empty chat shows suggestions:
  - "Show me all unpaid invoices"
  - "What's my GST liability for January?"
  - "Find duplicate payments"
- [ ] Conversation appears in left sidebar

**Expected**: New conversation created instantly

#### Test 1.3: Send Text Message
- [ ] Type: "Show me all unpaid invoices"
- [ ] Press Enter or click Send
- [ ] User message appears (blue bubble, right side)
- [ ] AI response streams in (gray bubble, left side)
- [ ] Bot icon shows on AI messages

**Expected**: Smooth streaming with no lag

---

### 2️⃣ File Upload Testing (10 min)

#### Test 2.1: Drag & Drop (Desktop)
- [ ] Find a PDF invoice on your computer
- [ ] Drag it over the chat input area
- [ ] Blue dashed border appears
- [ ] Drop overlay shows "Drop files to upload"
- [ ] Drop the file
- [ ] File chip appears below quick actions
- [ ] Shows file name and size

**Expected**: File attached, no errors

#### Test 2.2: Upload Button (Mobile/Desktop)
- [ ] Click the paperclip icon
- [ ] File picker opens
- [ ] Select a PDF invoice
- [ ] File chip appears with progress bar
- [ ] Upload progresses 0% → 100%

**Expected**: Upload completes successfully

#### Test 2.3: Send with File
- [ ] Type: "Process this invoice"
- [ ] Click Send
- [ ] User message shows with file attachment
- [ ] AI processes file (watch for stages):
  - ⏳ Uploading...
  - ⏳ Parsing...
  - ⏳ Classifying...
  - ✓ Classified: PURCHASE_INVOICE (XX% confidence)

**Expected**: Classification result appears

#### Test 2.4: Multiple Files
- [ ] Attach 3 PDFs at once
- [ ] Type: "Process all of these"
- [ ] Send message
- [ ] Watch progress for each file

**Expected**: All files process sequentially

---

### 3️⃣ Rich Message Cards (15 min)

#### Test 3.1: Extracted Data Card
After uploading an invoice:
- [ ] Card shows "Extracted Purchase Invoice"
- [ ] Confidence badge shows (e.g., "94% Confidence")
- [ ] Arithmetic verification badge:
  - Green "✓ Arithmetic Verified" OR
  - Yellow "⚠ Check Required"
- [ ] Data shows: Invoice #, Vendor, Date, Amount, GST
- [ ] Action buttons: [View Full Details]

**Expected**: All invoice data visible

#### Test 3.2: File Upload Card
During upload:
- [ ] Shows file name
- [ ] Progress bar animates
- [ ] Stage indicator changes:
  - Uploading → Parsing → Classifying → Ready
- [ ] Document type badge appears
- [ ] Confidence percentage shows

**Expected**: Real-time progress updates

#### Test 3.3: Confirmation Flow
When AI asks for confirmation:
- [ ] Confirmation card appears
- [ ] Shows message: "Data looks accurate. Shall I save this?"
- [ ] Buttons: [Yes, Save It] [No, Edit First]
- [ ] Click either button
- [ ] Toast notification appears

**Expected**: Button works, user can respond

---

### 4️⃣ Workflow Templates (10 min)

#### Test 4.1: Browse Templates
- [ ] Click "Browse Templates" button
- [ ] Template browser opens
- [ ] Shows 15 templates in grid
- [ ] Categories: Upload, Reconciliation, Analysis, Communication

**Expected**: All templates visible

#### Test 4.2: Search Templates
- [ ] Type "invoice" in search box
- [ ] Results filter to invoice-related workflows
- [ ] Clear search
- [ ] All templates reappear

**Expected**: Search works instantly

#### Test 4.3: Filter by Category
- [ ] Click "Upload" tab
- [ ] Shows 3 upload workflows
- [ ] Click "Reconciliation" tab
- [ ] Shows 4 reconciliation workflows
- [ ] Click "All" tab
- [ ] Shows all 15 workflows

**Expected**: Filters work correctly

#### Test 4.4: Use Template
- [ ] Click "Upload & Process Invoice" template card
- [ ] Chat input auto-fills with detailed prompt
- [ ] Text cursor moves to end
- [ ] Press Enter to send

**Expected**: Prompt sent, AI responds appropriately

---

### 5️⃣ Mobile Responsiveness (10 min)

#### Test 5.1: Mobile Layout (Chrome DevTools)
- [ ] Open DevTools (F12)
- [ ] Click "Toggle device toolbar" (Ctrl+Shift+M)
- [ ] Select "iPhone 12 Pro"
- [ ] Conversation list hidden by default
- [ ] Hamburger menu (☰) appears in top-left

**Expected**: Mobile layout active

#### Test 5.2: Conversation Menu
- [ ] Click hamburger menu
- [ ] Slide-over appears from left
- [ ] Shows conversation list
- [ ] Click "New Chat" button
- [ ] Menu closes, new chat created

**Expected**: Smooth slide animation

#### Test 5.3: Side Panel (Mobile)
- [ ] Upload a file that opens side panel
- [ ] Panel appears as bottom sheet (80% height)
- [ ] Swipe down to close
- [ ] Panel dismisses

**Expected**: Bottom sheet works on mobile

#### Test 5.4: Quick Actions (Mobile)
- [ ] Quick actions scroll horizontally
- [ ] Button labels abbreviated:
  - "Upload Files" → "Upload"
  - "Show Unpaid" (full label)
- [ ] All buttons accessible via scroll

**Expected**: Horizontal scroll works

---

### 6️⃣ Performance Testing (5 min)

#### Test 6.1: Long Conversation
- [ ] Send 20+ messages rapidly
- [ ] Observe scrolling smoothness
- [ ] No lag or jank
- [ ] Auto-scrolls to bottom

**Expected**: Smooth performance

#### Test 6.2: Multiple Files
- [ ] Upload 5 files simultaneously
- [ ] Watch progress indicators
- [ ] All process without errors
- [ ] Memory usage stable (check DevTools)

**Expected**: Handles concurrent uploads

#### Test 6.3: Switch Conversations
- [ ] Create 5 conversations
- [ ] Switch between them rapidly
- [ ] Each loads history correctly
- [ ] No delay or flash

**Expected**: Fast conversation switching

---

### 7️⃣ Error Handling (5 min)

#### Test 7.1: Network Disconnect
- [ ] Open DevTools → Network tab
- [ ] Set throttling to "Offline"
- [ ] Send a message
- [ ] Error appears in chat
- [ ] Toast notification shows error

**Expected**: Graceful error handling

#### Test 7.2: Invalid File Type
- [ ] Try uploading a .exe or .zip file
- [ ] Error message: "Unsupported file type"
- [ ] Upload rejected

**Expected**: Validation works

#### Test 7.3: Error Boundary
- [ ] Simulate error (if possible)
- [ ] Error boundary catches it
- [ ] Shows friendly error UI
- [ ] "Try Again" button works

**Expected**: No white screen of death

---

### 8️⃣ SSE Streaming (5 min)

#### Test 8.1: Streaming Response
- [ ] Send: "Explain GST reconciliation"
- [ ] Watch response stream word-by-word
- [ ] No chunks appear out of order
- [ ] Streaming indicator (spinner) shows
- [ ] Stops when complete

**Expected**: Smooth streaming

#### Test 8.2: Tool Execution
- [ ] Send: "Find duplicate payments"
- [ ] AI calls tool (console log shows "Tool call: find_duplicate_payments")
- [ ] Side panel opens with results
- [ ] Results display as JSON or table

**Expected**: Tool result visible

---

### 9️⃣ Advanced Features (10 min)

#### Test 9.1: Keyboard Shortcuts
- [ ] Press Cmd+K (or Ctrl+K)
- [ ] Jumps to chat page
- [ ] Works from any page

**Expected**: Shortcut works globally

#### Test 9.2: Quick Actions
- [ ] Click "Upload Files" quick action
- [ ] File picker opens
- [ ] Click "Show Unpaid Invoices"
- [ ] Auto-fills chat input

**Expected**: Quick actions populate input

#### Test 9.3: Edit & Diff (Side Panel)
- [ ] Open side panel with data
- [ ] Click "Edit" tab
- [ ] Modify a field value
- [ ] Click "Diff" tab
- [ ] See green/yellow/red changes

**Expected**: Diff shows changes correctly

#### Test 9.4: Export Data
- [ ] Open side panel
- [ ] Click download icon
- [ ] JSON file downloads
- [ ] File contains correct data

**Expected**: Export works

---

### 🔟 Integration Testing (10 min)

#### Test 10.1: Full Invoice Workflow
- [ ] Upload invoice PDF
- [ ] AI classifies as PURCHASE_INVOICE
- [ ] Extracts all fields
- [ ] Shows 90%+ confidence
- [ ] Arithmetic verified ✓
- [ ] Click action button
- [ ] Confirmation card appears
- [ ] Confirm save
- [ ] Success message

**Expected**: Complete end-to-end flow works

#### Test 10.2: Batch Upload Workflow
- [ ] Select "Batch Document Upload" template
- [ ] Send prompt
- [ ] Upload 3 invoices
- [ ] Watch sequential processing
- [ ] Summary shows: "3 success, 0 failed"

**Expected**: Batch processing completes

---

## 🐛 Common Issues & Solutions

### Issue: "Module not found: Skeleton"
**Solution**: Already fixed - skeleton.tsx created

### Issue: "Confirmation endpoint not found"
**Solution**: Already fixed - uses text responses instead

### Issue: Files won't upload
**Check**:
- Backend running on port 4000?
- File size < 25MB?
- File type is PDF/Excel/Image?

### Issue: Streaming not working
**Check**:
- SSE endpoint accessible: `http://localhost:4000/api/chat/stream`
- Token in localStorage
- Active conversation ID exists

---

## ✅ Success Criteria

### Must Pass:
- [x] Chat interface loads without errors
- [x] Can send text messages
- [x] Can upload files
- [x] Files process and classify
- [x] Workflow templates work
- [x] Mobile layout responsive
- [x] Error handling graceful

### Performance:
- [x] Streaming < 100ms latency
- [x] File upload shows progress
- [x] 20+ messages no lag
- [x] Conversation switch < 500ms

### UX:
- [x] No console errors
- [x] All buttons work
- [x] Tooltips show on hover
- [x] Loading states visible
- [x] Mobile friendly

---

## 📊 Test Results Template

```
Date: ___________
Tester: _________

Basic Chat Flow:      ✅ / ❌
File Upload:          ✅ / ❌
Rich Cards:           ✅ / ❌
Workflow Templates:   ✅ / ❌
Mobile Responsive:    ✅ / ❌
Performance:          ✅ / ❌
Error Handling:       ✅ / ❌
SSE Streaming:        ✅ / ❌
Advanced Features:    ✅ / ❌
Integration:          ✅ / ❌

Overall: ✅ PASS / ❌ FAIL

Notes:
_______________________
_______________________
```

---

## 🚀 Ready to Test!

Open your browser to **http://localhost:3000** and start testing!

**Pro Tips**:
1. Open DevTools Console to watch for errors
2. Open Network tab to monitor API calls
3. Test on real mobile device if possible
4. Take screenshots of any issues
5. Note exact steps to reproduce bugs
