'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  X,
  FileText,
  Image,
  File,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/csv': ['.csv'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
};

const MAX_FILE_SIZE = 26214400; // 25MB
const MAX_FILES = 10;

const DOCUMENT_TYPES = [
  { value: 'PURCHASE_ORDER', label: 'Purchase Order' },
  { value: 'PURCHASE_INVOICE', label: 'Purchase Invoice' },
  { value: 'SALES_INVOICE', label: 'Sales Invoice' },
  { value: 'BANK_STATEMENT', label: 'Bank Statement' },
  { value: 'GST_RETURN', label: 'GST Return' },
  { value: 'CREDIT_DEBIT_NOTE', label: 'Credit/Debit Note' },
  { value: 'INVENTORY_UPLOAD', label: 'Inventory Upload' },
  { value: 'VENDOR_MASTER', label: 'Vendor Master' },
  { value: 'CUSTOMER_MASTER', label: 'Customer Master' },
  { value: 'OTHER', label: 'Other' },
];

interface FileWithStatus {
  file: File; // Keep original File object
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  uploadedFileId?: string;
  preview?: string;
}

interface UploadedFile {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  downloadUrl: string;
  documentType: string;
}

interface MultiFileUploadProps {
  onUploadComplete?: (files: UploadedFile[]) => void;
  maxFiles?: number;
  autoUpload?: boolean;
}

export function MultiFileUpload({
  onUploadComplete,
  maxFiles = MAX_FILES,
  autoUpload = false,
}: MultiFileUploadProps) {
  const [files, setFiles] = useState<FileWithStatus[]>([]);
  const [documentType, setDocumentType] = useState('PURCHASE_INVOICE');
  const [globalError, setGlobalError] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setGlobalError('');

      // Handle rejected files
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors[0]?.code === 'file-too-large') {
          setGlobalError('One or more files exceed the 25MB limit');
        } else if (rejection.errors[0]?.code === 'file-invalid-type') {
          setGlobalError('One or more files have an unsupported format');
        } else if (rejection.errors[0]?.code === 'too-many-files') {
          setGlobalError(`Maximum ${maxFiles} files allowed`);
        } else {
          setGlobalError('Some files were rejected');
        }
        return;
      }

      // Check total file count
      if (files.length + acceptedFiles.length > maxFiles) {
        setGlobalError(`Maximum ${maxFiles} files allowed. You can upload ${maxFiles - files.length} more.`);
        return;
      }

      // Add files with status
      const filesWithStatus: FileWithStatus[] = acceptedFiles.map((file) => {
        const fileWithStatus: FileWithStatus = {
          file: file, // Keep original File object
          id: crypto.randomUUID(),
          status: 'pending' as const,
          progress: 0,
        };

        // Add preview for images
        if (file.type.startsWith('image/')) {
          fileWithStatus.preview = URL.createObjectURL(file);
        }

        return fileWithStatus;
      });

      setFiles((prev) => [...prev, ...filesWithStatus]);

      // Auto-upload if enabled
      if (autoUpload) {
        filesWithStatus.forEach((fileWrapper) => uploadSingleFile(fileWrapper));
      }
    },
    [files.length, maxFiles, autoUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    maxFiles: maxFiles,
    multiple: true,
  });

  const uploadSingleFile = async (fileWrapper: FileWithStatus) => {
    const file = fileWrapper.file; // Get the original File object

    console.log('Starting upload for file:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    });

    // Update status to uploading
    setFiles((prev) =>
      prev.map((f) => (f.id === fileWrapper.id ? { ...f, status: 'uploading', progress: 0 } : f))
    );

    try {
      const formData = new FormData();
      // Backend expects multipart/form-data with fields and file parts
      formData.append('documentType', documentType);
      // Append the original File object - backend uses request.parts()
      formData.append('file', file, file.name);

      console.log('FormData created with documentType:', documentType, 'and file:', file.name);

      const token = localStorage.getItem('token');
      console.log('Auth token available:', !!token);

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileWrapper.id ? { ...f, progress: percentComplete } : f
            )
          );
        }
      });

      // Handle completion
      await new Promise<void>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const result = JSON.parse(xhr.responseText);
              if (result.success && result.data && result.data.uploads && result.data.uploads.length > 0) {
                const uploadedFile = result.data.uploads[0];
                setFiles((prev) =>
                  prev.map((f) =>
                    f.id === fileWrapper.id
                      ? {
                          ...f,
                          status: 'success',
                          progress: 100,
                          uploadedFileId: uploadedFile.id,
                        }
                      : f
                  )
                );
                setUploadedFiles((prev) => [...prev, uploadedFile]);
                resolve();
              } else {
                reject(new Error(result.error || 'Upload failed - no file data returned'));
              }
            } catch (parseError) {
              reject(new Error(`Failed to parse response: ${xhr.responseText}`));
            }
          } else {
            // Try to parse error message
            console.error('Upload failed. Status:', xhr.status, 'Response:', xhr.responseText);
            try {
              const errorResult = JSON.parse(xhr.responseText);
              console.error('Parsed error:', errorResult);
              reject(new Error(errorResult.error || `Upload failed with status ${xhr.status}`));
            } catch (parseError) {
              console.error('Failed to parse error response:', parseError);
              reject(new Error(`Upload failed with status ${xhr.status}. Response: ${xhr.responseText || 'No response'}`));
            }
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error occurred'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelled'));
        });

        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        xhr.open('POST', `${API_URL}/api/uploads`);
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        xhr.send(formData);
      });
    } catch (error) {
      console.error('Upload error for file:', file.name, error);
      const errorMessage =
        error instanceof Error ? error.message : 'Upload failed';
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileWrapper.id
            ? { ...f, status: 'error', error: errorMessage, progress: 0 }
            : f
        )
      );
    }
  };

  const uploadAllFiles = async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending' || f.status === 'error');

    if (pendingFiles.length === 0) {
      setGlobalError('No files to upload');
      return;
    }

    setGlobalError('');

    // Upload all files concurrently
    await Promise.all(pendingFiles.map((file) => uploadSingleFile(file)));

    // Trigger completion callback
    if (onUploadComplete && uploadedFiles.length > 0) {
      onUploadComplete(uploadedFiles);
    }
  };

  const removeFile = (fileId: string) => {
    setFiles((prev) => {
      const fileWrapper = prev.find((f) => f.id === fileId);
      if (fileWrapper?.preview) {
        URL.revokeObjectURL(fileWrapper.preview);
      }
      return prev.filter((f) => f.id !== fileId);
    });
  };

  const retryFile = (fileId: string) => {
    const fileWrapper = files.find((f) => f.id === fileId);
    if (fileWrapper) {
      uploadSingleFile(fileWrapper);
    }
  };

  const clearCompleted = () => {
    setFiles((prev) => {
      prev.forEach((fileWrapper) => {
        if (fileWrapper.preview && fileWrapper.status === 'success') {
          URL.revokeObjectURL(fileWrapper.preview);
        }
      });
      return prev.filter((f) => f.status !== 'success');
    });
  };

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return File;
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType === 'application/pdf') return FileText;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    if (isNaN(bytes) || !isFinite(bytes)) {
      console.error('Invalid file size:', bytes);
      return 'Unknown size';
    }
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusColor = (status: FileWithStatus['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'uploading':
        return 'text-blue-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const uploadingCount = files.filter((f) => f.status === 'uploading').length;
  const successCount = files.filter((f) => f.status === 'success').length;
  const errorCount = files.filter((f) => f.status === 'error').length;

  return (
    <div className="space-y-6">
      {/* Document Type Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Document Type</label>
        <select
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          disabled={uploadingCount > 0}
        >
          {DOCUMENT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Dropzone */}
      {files.length < maxFiles && (
        <div
          {...getRootProps()}
          className={cn(
            'cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors',
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50',
            uploadingCount > 0 && 'pointer-events-none opacity-50'
          )}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-2 text-sm font-medium">
            {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="mb-4 text-xs text-muted-foreground">or click to browse</p>
          <div className="text-xs text-muted-foreground">
            <p>Accepted: PDF, Excel, CSV, Images</p>
            <p>Max size: 25MB per file • Max files: {maxFiles}</p>
            <p className="mt-2 font-medium">
              {files.length}/{maxFiles} files added
            </p>
          </div>
        </div>
      )}

      {/* Global Error */}
      {globalError && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {globalError}
        </div>
      )}

      {/* Upload Stats */}
      {files.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold">{pendingCount}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Uploading</p>
            <p className="text-2xl font-bold text-blue-600">{uploadingCount}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Success</p>
            <p className="text-2xl font-bold text-green-600">{successCount}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Failed</p>
            <p className="text-2xl font-bold text-red-600">{errorCount}</p>
          </Card>
        </div>
      )}

      {/* Action Buttons */}
      {files.length > 0 && (
        <div className="flex gap-2">
          <Button
            onClick={uploadAllFiles}
            disabled={uploadingCount > 0 || (pendingCount === 0 && errorCount === 0)}
            className="flex-1"
          >
            {uploadingCount > 0 ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading {uploadingCount} file{uploadingCount > 1 ? 's' : ''}...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload {pendingCount + errorCount} file{pendingCount + errorCount > 1 ? 's' : ''}
              </>
            )}
          </Button>
          {successCount > 0 && (
            <Button variant="outline" onClick={clearCompleted}>
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Completed
            </Button>
          )}
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Files</p>
          {files.map((fileWrapper) => {
            const Icon = getFileIcon(fileWrapper.file.type);

            return (
              <Card key={fileWrapper.id} className="p-4">
                <div className="flex items-start gap-3">
                  {/* Icon/Preview */}
                  {fileWrapper.preview ? (
                    <img
                      src={fileWrapper.preview}
                      alt={fileWrapper.file.name}
                      className="h-12 w-12 flex-shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded bg-muted">
                      <Icon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}

                  {/* File Info */}
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{fileWrapper.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(fileWrapper.file.size)}
                        </p>
                      </div>

                      {/* Status Icon */}
                      <div className={cn('flex-shrink-0', getStatusColor(fileWrapper.status))}>
                        {fileWrapper.status === 'success' && (
                          <CheckCircle className="h-5 w-5" />
                        )}
                        {fileWrapper.status === 'error' && <AlertCircle className="h-5 w-5" />}
                        {fileWrapper.status === 'uploading' && (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {fileWrapper.status === 'uploading' && (
                      <div className="space-y-1">
                        <Progress value={fileWrapper.progress} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {fileWrapper.progress}%
                        </p>
                      </div>
                    )}

                    {/* Error Message */}
                    {fileWrapper.status === 'error' && fileWrapper.error && (
                      <p className="text-xs text-red-600">{fileWrapper.error}</p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      {fileWrapper.status === 'error' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => retryFile(fileWrapper.id)}
                        >
                          Retry
                        </Button>
                      )}
                      {fileWrapper.status !== 'uploading' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(fileWrapper.id)}
                        >
                          <X className="mr-1 h-3 w-3" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Success Summary */}
      {uploadedFiles.length > 0 && successCount === files.length && (
        <Card className="border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 flex-shrink-0 text-green-600" />
            <div>
              <p className="font-medium text-green-900">
                All files uploaded successfully!
              </p>
              <p className="text-sm text-green-700">
                {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} ready
                for processing
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
