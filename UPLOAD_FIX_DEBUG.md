# Upload Fix - Debugging Guide

## Issue Reported
- Error: "NaN undefined"
- Error: "Upload failed with status 400"
- Occurs when uploading PDF files

## Fixes Applied (February 12, 2026)

### 1. Enhanced Error Logging
**File**: `apps/web/components/upload/multi-file-upload.tsx`

Added detailed console logging to track:
- File details when upload starts (name, size, type, lastModified)
- FormData creation with documentType
- Auth token availability
- Detailed error responses from backend
- Error parsing details

### 2. Fixed formatFileSize Function
**Problem**: Function returned "NaN undefined" when given invalid values

**Fix**:
```typescript
const formatFileSize = (bytes: number) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  if (isNaN(bytes) || !isFinite(bytes)) {
    console.error('Invalid file size:', bytes);
    return 'Unknown size';
  }
  // ... rest of the function
};
```

### 3. Improved Error Messages
**Before**: Generic "Upload failed with status 400"

**After**: Shows actual backend error message:
```typescript
reject(new Error(`Upload failed with status ${xhr.status}. Response: ${xhr.responseText || 'No response'}`));
```

## Testing Checklist

### Step 1: Check Authentication
1. Open http://localhost:3000/login
2. Log in with your credentials
3. Verify you're redirected to the dashboard

### Step 2: Test File Upload
1. Go to http://localhost:3000/uploads
2. Click "Upload Files" button
3. Select document type: "Purchase Invoice"
4. Drag & drop a PDF file or click to browse

### Step 3: Check Browser Console
Open browser console (F12 → Console tab) and look for:

**Expected logs when starting upload:**
```
Starting upload for file: {name: "test.pdf", size: 12345, type: "application/pdf", ...}
FormData created with documentType: PURCHASE_INVOICE and file: test.pdf
Auth token available: true
```

**If upload succeeds:**
- Progress bar should show 0% → 100%
- File should show ✓ success icon
- File should appear in the uploads list

**If upload fails:**
```
Upload failed. Status: XXX Response: {...}
Parsed error: { success: false, error: "..." }
Upload error for file: test.pdf Error: ...
```

## Common Errors and Solutions

### Error 401: Authentication required
**Cause**: Not logged in or token expired

**Solution**:
1. Go to http://localhost:3000/login
2. Log in again
3. Try uploading again

### Error 400: Upload failed
**Possible causes**:
1. File too large (max 25MB)
2. Unsupported file type
3. Too many files at once (max 10)
4. Backend service issue (S3, database)

**Check console logs for exact error message**

### Error 500: Internal server error
**Possible causes**:
1. Backend service down (S3, database)
2. Missing environment variables
3. File storage service unavailable

**Check backend logs**:
```bash
cd /Users/apple/auditflow
pnpm --filter @auditflow/api dev
# Look for error messages
```

### "NaN undefined" Display
**Fixed**: formatFileSize now handles invalid values gracefully
- Shows "Unknown size" instead of "NaN undefined"
- Logs error to console for debugging

## Backend Health Check

Check if backend is running:
```bash
curl http://localhost:4000/api/health
```

Expected response:
```json
{"status":"healthy","timestamp":"2026-02-12T...","version":"1.0.0"}
```

## File Upload Requirements

**Accepted file types**:
- PDF (.pdf)
- Excel (.xlsx, .xls)
- CSV (.csv)
- Images (.jpg, .jpeg, .png)

**Limits**:
- Max file size: 25MB
- Max files per batch: 10

**Required**:
- Must be logged in (valid JWT token)
- Must select document type before uploading

## Debugging the Backend

If uploads still fail after frontend fixes, check backend:

### 1. Check Backend Logs
```bash
cd /Users/apple/auditflow/apps/api
# Backend should show logs like:
# [INFO] File upload request received
# [INFO] File uploaded successfully: <filename>
# [ERROR] <any error details>
```

### 2. Test Upload Directly
Create a test file and upload via curl:
```bash
# 1. Login to get token
TOKEN=$(curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}' \
  | jq -r '.data.token')

# 2. Upload test file
curl -X POST http://localhost:4000/api/uploads \
  -H "Authorization: Bearer $TOKEN" \
  -F "documentType=PURCHASE_INVOICE" \
  -F "file=@/path/to/test.pdf"
```

### 3. Check Environment Variables
Ensure these are set in `apps/api/.env`:
```
DATABASE_URL=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...
AWS_REGION=...
```

## Next Steps

1. **Test the upload** with browser console open
2. **Share the console logs** if it still fails
3. **Check if you're logged in**
4. **Try a different PDF file** (maybe current file is corrupted)

## Status

✅ Frontend error handling improved
✅ Better error messages
✅ Fixed "NaN undefined" display
✅ Added detailed debugging logs
⏳ Awaiting user test results

---

**Last Updated**: February 12, 2026
**Files Modified**:
- `apps/web/components/upload/multi-file-upload.tsx`
