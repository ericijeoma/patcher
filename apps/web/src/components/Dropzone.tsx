import { useState, useCallback } from 'react'
import { useDropzone, FileRejection } from 'react-dropzone'
import { CloudUpload, FileText, AlertTriangle, CheckCircle2, X, AlertCircle } from 'lucide-react'

interface DropzoneProps {
  onFilesAccepted: (files: File[]) => void
  maxFiles?: number
  maxSize?: number
  accept?: Record<string, string[]>
  disabled?: boolean
}

// Global default configuration mapping standard file extensions to valid MIME types
const DEFAULT_ACCEPT_TYPES: Record<string, string[]> = {
  // Core Binaries & OS Executables
  'application/octet-stream': ['.exe', '.dll', '.sys', '.bin', '.elf'],
  'application/x-msdownload': ['.msi'],
  // Scripts & Source Files
  'text/javascript': ['.js'],
  'application/x-bat': ['.bat', '.cmd'],
  'text/plain': ['.vbs', '.ps1'],
  'application/java-archive': ['.jar', '.class'],
  'application/vnd.android.package-archive': ['.apk'],
  // Compressed Archives
  'application/zip': ['.zip'],
  'application/x-rar-compressed': ['.rar'],
  'application/x-7z-compressed': ['.7z'],
  'application/x-tar': ['.tar'],
  'application/gzip': ['.gz'],
  // Analysis Documents
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx']
}

export default function Dropzone({
  onFilesAccepted,
  maxFiles = 5,
  maxSize = 50 * 1024 * 1024, // 50MB
  accept = DEFAULT_ACCEPT_TYPES,
  disabled = false
}: DropzoneProps) {
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [acceptedFiles, setAcceptedFiles] = useState<File[]>([])

const startUploadProcess = async (files: File[]) => {
    setUploadStatus('uploading')
    setUploadProgress(0)

    try {
      // Simulate real-time upload progress ticks
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200))
        setUploadProgress(i)
      }

      setUploadProgress(100)
      setUploadStatus('success')

      // Auto-flush queue after UI confirmation delay
     setTimeout(() => {
  console.log('[DROPZONE] About to call onFilesAccepted')
  console.log('[DROPZONE] Files:', files)

  onFilesAccepted(files)

  console.log('[DROPZONE] onFilesAccepted finished')

  setUploadStatus('idle')
  setUploadProgress(null)
  setAcceptedFiles([])
}, 2000)

    } catch (error) {
      setUploadStatus('error')
      setErrorMessage('Upload failed. Please try again.')
    }
  }

  const onDrop = useCallback((passedFiles: File[], rejectedFiles: FileRejection[]) => {
    // Check if total queue size overflows strict parameters
    if (passedFiles.length > maxFiles) {
      setErrorMessage(`You can only upload up to ${maxFiles} files at a time`)
      setUploadStatus('error')
      return
    }

    // Secondary deep check for isolated oversized footprints
    const oversizedFiles = passedFiles.filter(file => file.size > maxSize)
    if (oversizedFiles.length > 0) {
      setErrorMessage(`File size exceeds maximum limit of ${maxSize / (1024 * 1024)}MB`)
      setUploadStatus('error')
      return
    }

    // Gracefully catch engine rejection criteria (MIME type mismatch)
    if (rejectedFiles.length > 0) {
      const uniqueReasons = Array.from(
        new Set(rejectedFiles.flatMap(file => file.errors.map(err => err.message)))
      )
      setErrorMessage(`File rejected: ${uniqueReasons.join(', ')}`)
      setUploadStatus('error')
      return
    }

    setAcceptedFiles(passedFiles)
    setErrorMessage(null)
    setUploadStatus('idle')

    startUploadProcess(passedFiles)
  }, [maxFiles, maxSize])

  const removeFile = (index: number) => {
    const newFiles = [...acceptedFiles]
    newFiles.splice(index, 1)
    setAcceptedFiles(newFiles)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    maxSize,
    multiple: true,
    disabled,
  })

  const fileSizeLimit = maxSize / (1024 * 1024)

  return (
    <div className="space-y-4">
      {/* Dropzone Trigger Boundary Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
            : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-400'
        }`}
      >
        <input {...getInputProps()} />
        <CloudUpload className="mx-auto h-12 w-12 text-indigo-500 dark:text-indigo-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          or click to browse local files
        </p>
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>Supported footprints: Executables, Documents, Archives, Scripts</p>
          <p>Maximum payload scope: {fileSizeLimit}MB per file</p>
          <p>Queue capacity limit: {maxFiles} structural files max</p>
        </div>
      </div>

      {/* Target Queue Staging Output UI */}
      {acceptedFiles.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Selected Payload Array</h4>
          <ul className="space-y-2">
            {acceptedFiles.map((file, index) => (
              <li key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <div className="flex items-center flex-1 overflow-hidden">
                  <FileText className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2 flex-shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {Math.round(file.size / 1024)} KB • {file.type || 'Unknown stream mapping'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(index)
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400 ml-2"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Real-time Simulated Stream Monitoring */}
      {uploadStatus === 'uploading' && uploadProgress !== null && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-900 dark:text-white">Pushing binaries to engine payload pipeline...</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-indigo-500 h-2.5 rounded-full transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Pipeline Isolation State Feedback Messaging */}
      {uploadStatus === 'success' && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center">
          <CheckCircle2 className="h-5 w-5 text-green-500 dark:text-green-400 mr-3 animate-pulse" />
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-400">Upload execution successful.</p>
            <p className="text-sm text-green-700 dark:text-green-300">Passing files off to core AI static interpreter footprint blocks...</p>
          </div>
        </div>
      )}

      {uploadStatus === 'error' && errorMessage && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 mr-3" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-400">Ingestion Blocked</p>
            <p className="text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
          </div>
        </div>
      )}

    </div>
  )
}
