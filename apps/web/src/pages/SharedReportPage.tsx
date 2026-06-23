import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { FileText, Shield, AlertTriangle, CheckCircle2, Info, Code, Clock, Download, AlertCircle } from 'lucide-react'

// Mock API call - replace with actual API call
const fetchSharedReport = async (shareId: string) => {
  // Mock data based on share ID
  const mockReports: Record<string, any> = {
    scan1: {
      id: shareId,
      filename: 'malware_sample.exe',
      file_size: '2.4 MB',
      file_type: 'PE32 executable (GUI) Intel 80386, for MS Windows',
      md5: 'd41d8cd98f00b204e9800998ecf8427e',
      sha1: 'da39a3ee5e6b4b0d3255bfef95601890afd80709',
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      scan_date: '2023-06-20T10:30:00Z',
      risk_score: 85,
      verdict: 'malicious',
      detection_names: ['Trojan.Win32.Generic', 'Backdoor.Agent'],
      file_info: {
        compilation_timestamp: '2023-01-15T08:30:00Z',
        entry_point: '0x401000',
        sections: ['.text', '.data', '.rdata', '.rsrc'],
        imports: ['kernel32.dll', 'user32.dll', 'advapi32.dll'],
        exports: []
      },
      strings: [
        'MZ', 'This program cannot be run in DOS mode', 'kernel32.dll',
        'LoadLibraryA', 'GetProcAddress', 'http://malicious-domain.com',
        'C:\\Windows\\System32\\', 'cmd.exe', '/c', 'powershell'
      ],
      behavior: {
        registry_keys: ['HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'],
        files_created: ['C:\\Windows\\Temp\\malware.exe'],
        network_connections: ['8.8.8.8:443', '192.168.1.1:80'],
        processes_created: ['cmd.exe', 'powershell.exe']
      },
      shared_by: 'user@example.com',
      shared_at: '2023-06-20T10:35:00Z',
      expires_at: '2023-07-20T10:35:00Z'
    },
    scan2: {
      id: shareId,
      filename: 'document.pdf',
      file_size: '1.2 MB',
      file_type: 'PDF document',
      md5: '25f9e794323b453885f5181f1b624d0b',
      sha1: '3b7bb9c5f39f4b34b356a7d8a5b6e0b7b5b6a7d8',
      sha256: 'f3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      scan_date: '2023-06-19T14:45:00Z',
      risk_score: 15,
      verdict: 'clean',
      detection_names: [],
      file_info: {
        pdf_version: '1.7',
        pages: 12,
        encrypted: false,
        objects: 456,
        streams: 123
      },
      strings: [
        'PDF-1.7', 'Adobe Acrobat', 'Title: Quarterly Report',
        'Author: John Doe', 'Subject: Financial Results'
      ],
      behavior: {},
      shared_by: 'analyst@company.com',
      shared_at: '2023-06-19T14:50:00Z',
      expires_at: '2023-07-19T14:50:00Z'
    }
  }

  return mockReports[shareId] || {
    id: shareId,
    filename: 'unknown_file',
    file_size: '0 KB',
    file_type: 'Unknown',
    risk_score: 0,
    verdict: 'unknown'
  }
}

export default function SharedReportPage() {
  const { shareId } = useParams({ strict: false }) as { shareId: string }
  const [activeTab, setActiveTab] = useState('overview')

  const { data: reportData, isLoading, error } = useQuery({
    queryKey: ['sharedReport', shareId],
    queryFn: () => fetchSharedReport(shareId)
  })

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'bg-red-500'
    if (score >= 40) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getVerdictColor = (verdict: string) => {
    if (verdict === 'malicious') return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400'
    if (verdict === 'suspicious') return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400'
    if (verdict === 'clean') return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400'
    return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-700 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700 dark:text-red-400">Failed to load shared report</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!reportData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 dark:border-yellow-700 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-500 dark:text-yellow-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">Shared report not found</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Shared Analysis Report</h1>
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span>Share ID: {reportData.id}</span>
          <span className="flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            Shared {new Date(reportData.shared_at).toLocaleString()}
          </span>
          <span className="flex items-center">
            <AlertCircle className="h-4 w-4 mr-1" />
            Expires {new Date(reportData.expires_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Shared By Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
            {reportData.shared_by.charAt(0).toUpperCase()}
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Shared by {reportData.shared_by}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This report was shared for analysis purposes
            </p>
          </div>
        </div>
      </div>

      {/* File Info Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">File Information</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Filename</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{reportData.filename}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">File Type</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{reportData.file_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">File Size</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{reportData.file_size}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Hashes</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">MD5</span>
                <span className="text-sm font-mono text-gray-900 dark:text-white">{reportData.md5}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">SHA-1</span>
                <span className="text-sm font-mono text-gray-900 dark:text-white">{reportData.sha1}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">SHA-256</span>
                <span className="text-sm font-mono text-gray-900 dark:text-white">{reportData.sha256}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Analysis</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Risk Score</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{reportData.risk_score}%</span>
                  <div className={`w-16 h-2 rounded-full ${getRiskColor(reportData.risk_score)}`}></div>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Verdict</span>
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getVerdictColor(reportData.verdict)}`}>
                  {reportData.verdict.charAt(0).toUpperCase() + reportData.verdict.slice(1)}
                </span>
              </div>
              {reportData.detection_names && reportData.detection_names.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Detections</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {reportData.detection_names.join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {[
            { id: 'overview', name: 'Overview', icon: Info },
            { id: 'strings', name: 'Strings', icon: Code },
            { id: 'file_info', name: 'File Info', icon: FileText },
            { id: 'behavior', name: 'Behavior', icon: Shield }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700'
              }`}
            >
              <tab.icon className={`-ml-0.5 mr-2 h-5 w-5 ${activeTab === tab.id ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400'}`} />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        {activeTab === 'overview' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Analysis Summary</h3>
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-blue-500 dark:text-blue-400 mt-0.5 mr-3" />
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white">
                      This file has been analyzed and found to contain {reportData.verdict === 'malicious' ? 'malicious' : reportData.verdict === 'suspicious' ? 'suspicious' : 'no malicious'} content.
                      {reportData.verdict === 'malicious' && ' Exercise extreme caution when handling this file.'}
                    </p>
                  </div>
                </div>
              </div>

              {reportData.verdict === 'malicious' && (
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-red-500 dark:text-red-400 mt-0.5 mr-3" />
                    <div>
                      <h4 className="font-medium text-red-800 dark:text-red-400 mb-1">Security Recommendations</h4>
                      <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-400 space-y-1">
                        <li>Do not execute this file</li>
                        <li>Quarantine or delete the file immediately</li>
                        <li>Scan your system for additional infections</li>
                        <li>Review network connections and system changes</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'strings' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Extracted Strings</h3>
            {reportData.strings && reportData.strings.length > 0 ? (
              <div className="space-y-2">
                {reportData.strings.map((str: string, index: number) => (
                  <div key={index} className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm font-mono text-gray-900 dark:text-white break-all">
                    {str}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">No strings extracted from this file</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'file_info' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">File Structure Information</h3>
            {reportData.file_info ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(reportData.file_info).map(([key, value]: [string, any]) => (
                  <div key={key}>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      {key.replace(/_/g, ' ')}
                    </h4>
                    {Array.isArray(value) ? (
                      <ul className="list-disc list-inside text-sm text-gray-900 dark:text-white space-y-1">
                        {value.map((item: any, index: number) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-900 dark:text-white">{String(value)}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">No file structure information available</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'behavior' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Behavioral Analysis</h3>
            {reportData.behavior && Object.keys(reportData.behavior).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(reportData.behavior).map(([key, value]: [string, any]) => (
                  <div key={key}>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      {key.replace(/_/g, ' ')}
                    </h4>
                    {Array.isArray(value) ? (
                      <ul className="list-disc list-inside text-sm text-gray-900 dark:text-white space-y-1">
                        {value.map((item: any, index: number) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-900 dark:text-white">{String(value)}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="flex justify-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 dark:text-green-400" />
                </div>
                <h4 className="font-medium text-green-800 dark:text-green-400 mt-2">No Suspicious Behavior Detected</h4>
                <p className="text-gray-500 dark:text-gray-400 mt-1">This file did not exhibit any suspicious behavioral patterns</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
