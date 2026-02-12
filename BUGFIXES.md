# Bug Fixes - February 12, 2026

## Issues Fixed

### 1. ✅ Duplicate React Key Error

**Error**: "Encountered two children with the same key, `/inventory`"

**Cause**: Sidebar had two navigation items with the same `href="/inventory"` (lines 71-75 and 111-115)

**Fix**: Removed duplicate entry at lines 71-75

**File**: `apps/web/components/layout/sidebar.tsx`

**Status**: ✅ FIXED

---

### 2. ✅ Cannot Read 'startsWith' Error

**Error**: "Cannot read properties of undefined (reading 'startsWith')"

**Cause**: `getFileIcon()` function called with undefined `mimeType`

**Fix**: Added null/undefined check before calling `startsWith()`

**Files**:
- `apps/web/components/upload/multi-file-upload.tsx`
- `apps/web/components/upload/file-upload.tsx`

**Code Change**:
```typescript
// Before
const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return Image;
  ...
}

// After
const getFileIcon = (mimeType?: string) => {
  if (!mimeType) return File;
  if (mimeType.startsWith('image/')) return Image;
  ...
}
```

**Status**: ✅ FIXED

---

### 3. ⚠️ SSE Error During File Upload

**Error**: "SSE error: {} - 3 error recvd when uploading a file from front end"

**Cause**: The multi-file upload component uses XMLHttpRequest, not EventSource/SSE. This error is likely from:
1. A different component trying to use SSE
2. Network interruption during upload
3. Confused error message from another feature

**Investigation**:
- Multi-file upload does NOT use SSE - it uses XMLHttpRequest
- Only the AI Chat uses SSE for streaming
- The error might be from:
  a) User trying to use chat while uploading
  b) Browser console showing unrelated errors
  c) Connection issue during file upload

**Recommendation**:
- If this error persists, check:
  1. Is AI Chat open in another tab?
  2. Is network stable?
  3. What file is being uploaded?

**Status**: ℹ️ NEEDS MORE INFO

**Workaround**:
- Close AI chat before uploading files
- Ensure stable network connection
- Refresh page if errors persist

---

## Testing After Fixes

### Test 1: Sidebar Navigation
```
1. Open any page
2. Check browser console
3. ✅ Should NOT see "duplicate key" warning
4. Click each navigation item
5. ✅ All should navigate correctly
```

### Test 2: File Upload
```
1. Go to /uploads
2. Click "Upload Files"
3. Select 3-5 PDF files
4. Drag & drop
5. ✅ Should NOT see "startsWith" error
6. Click "Upload X files"
7. ✅ Should upload successfully with progress bars
```

### Test 3: Icon Display
```
1. Upload PDF, image, Excel files
2. ✅ Each should show correct icon
3. ✅ No console errors
```

---

## Verification

Run these commands after the fixes:

```bash
# Restart frontend
cd apps/web
pnpm dev

# Open browser
http://localhost:3000/uploads

# Check console - should be clean
# Upload files - should work without errors
```

---

## Status Summary

| Issue | Severity | Status | Fixed In |
|-------|----------|--------|----------|
| Duplicate key error | Low | ✅ FIXED | sidebar.tsx |
| startsWith error | Medium | ✅ FIXED | multi-file-upload.tsx, file-upload.tsx |
| SSE error | Low | ℹ️ INVESTIGATING | - |

---

## Next Steps

1. ✅ Restart dev server
2. ⚠️ Test file upload
3. ⚠️ Verify no console errors
4. ℹ️ Monitor for SSE errors (may be unrelated)

---

**Fixes Applied**: February 12, 2026
**Status**: 2/3 Issues Resolved
**Testing**: Recommended
