'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, X, FileText, Image, File, CheckCircle, AlertCircle } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

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

interface UploadedFile {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  downloadUrl: string;
  documentType: string;
}

interface FileUploadProps {
  documentType?: string;
  onUploadComplete?: (files: UploadedFile[]) => void;
  multiple?: boolean;
  maxFiles?: number;
}

interface FileWithPreview extends File {
  preview?: string;
}

export function FileUpload({
  documentType = 'OTHER',
  onUploadComplete,
  multiple = true,
  maxFiles = MAX_FILES,
}: FileUploadProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string>('');

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setError('');

      // Handle rejected files
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors[0]?.code === 'file-too-large') {
          setError('One or more files exceed the 25MB limit');
        } else if (rejection.errors[0]?.code === 'file-invalid-type') {
          setError('One or more files have an unsupported format');
        } else {
          setError('Some files were rejected');
        }
        return;
      }

      // Check total file count
      if (files.length + acceptedFiles.length > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`);
        return;
      }

      // Add preview URLs for images
      const filesWithPreview = acceptedFiles.map((file) => {
        if (file.type.startsWith('image/')) {
          return Object.assign(file, {
            preview: URL.createObjectURL(file),
          });
        }
        return file;
      });

      setFiles((prev) => [...prev, ...filesWithPreview]);
    },
    [files.length, maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    maxFiles: maxFiles,
    multiple,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev];
      const removed = newFiles.splice(index, 1)[0];
      if (removed.preview) {
        URL.revokeObjectURL(removed.preview);
      }
      return newFiles;
    });
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('documentType', documentType);

      files.forEach((file) => {
        formData.append('files', file);
      });

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/api/uploads', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setUploadedFiles(result.data.uploads);
        setFiles([]);
        if (onUploadComplete) {
          onUploadComplete(result.data.uploads);
        }
      } else {
        setError(result.error || 'Upload failed');
      }
    } catch (err) {
      setError('Failed to upload files. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType === 'application/pdf') return FileText;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      {files.length < maxFiles && (
        <div
          {...getRootProps()}
          className={cn(
            'cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors',
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50'
          )}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-2 text-sm font-medium">
            {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="mb-4 text-xs text-muted-foreground">
            or click to browse
          </p>
          <div className="text-xs text-muted-foreground">
            <p>Accepted: PDF, Excel, CSV, Images</p>
            <p>Max size: 25MB per file</p>
            <p>Max files: {maxFiles}</p>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {files.length} file{files.length > 1 ? 's' : ''} selected
            </p>
            <Button
              onClick={handleUpload}
              disabled={uploading}
              size="sm"
            >
              {uploading ? 'Uploading...' : 'Upload Files'}
            </Button>
          </div>

          {files.map((file, index) => {
            const Icon = getFileIcon(file.type);

            return (
              <Card key={index} className="flex items-center gap-3 p-3">
                {file.preview ? (
                  <img
                    src={file.preview}
                    alt={file.name}
                    className="h-12 w-12 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                    <Icon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {/* Uploaded files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-green-600">
            <CheckCircle className="h-4 w-4" />
            {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} uploaded
            successfully
          </div>

          {uploadedFiles.map((file) => {
            const Icon = getFileIcon(file.mimeType);

            return (
              <Card key={file.id} className="flex items-center gap-3 p-3">
                <div className="flex h-12 w-12 items-center justify-center rounded bg-green-500/10">
                  <Icon className="h-6 w-6 text-green-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{file.originalName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.fileSize)}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(file.downloadUrl, '_blank')}
                >
                  Preview
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
