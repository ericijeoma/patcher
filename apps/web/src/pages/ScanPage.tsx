import { useState, useRef, useEffect } from 'react';
import { useScanner } from '../hooks/useScanner';
import { useSession } from '../lib/auth';
import { Link } from '@tanstack/react-router'
import { Upload, Check, AlertTriangle, FileText, Loader2 } from 'lucide-react';


export default function ScanPage() {
  const { state, scan, result, error, progress, reset } = useScanner();
  const { data: session } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [usage, setUsage] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch usage data
  useEffect(() => {
    const fetchUsage = async () => {
      if (!session?.session?.token) return;

      try {
        const response = await fetch(`${import.meta.env.VITE_WORKER_URL}/v1/usage`, {
          headers: {
        'Authorization': `Bearer ${session.session?.token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUsage(data);
        }
      } catch (err) {
        console.error('Failed to fetch usage:', err);
      }
    };

    fetchUsage();
  }, [session]);

  const handleFileChange = (selectedFile: File | null) => {
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileChange(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleScanClick = () => {
    if (file) {
      scan(file);
    }
  };

  const renderQuotaBar = () => {
    if (!usage) return null;

    const isUnlimited = usage.daily_limit === null;
    const isExceeded = usage.scans_today >= (usage.daily_limit || 0);

    if (isExceeded) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
              <span className="font-medium">Daily scan limit reached</span>
            </div>
            <Link to={"/pricing" as any} className="text-blue-600 font-medium hover:underline">
              Upgrade plan →
            </Link>
          </div>
        </div>
      );
    }

    if (isUnlimited) {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <Check className="w-5 h-5 text-blue-600 mr-2" />
            <span className="font-medium">Unlimited scans</span>
          </div>
        </div>
      );
    }

    const percentage = Math.min(100, (usage.scans_today / usage.daily_limit) * 100);

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-blue-700">
            {usage.scans_today} of {usage.daily_limit} free scans used today
          </span>
          <span className="text-sm text-blue-600">
            Resets at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full"
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    );
  };

  const renderDropZone = () => {
    if (usage && usage.scans_today >= (usage.daily_limit || 0)) {
      return null;
    }

    return (
      <div
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
          isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-300'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
          className="hidden"
          accept=".exe,.bin,.dll,.so,.elf"
        />
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          Drop your binary file here, or click to browse
        </h3>
        <p className="text-sm text-gray-500">
          Supported formats: .exe, .bin, .dll, .so, .elf
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Your file never leaves this browser tab
        </p>
      </div>
    );
  };

  const renderFilePreview = () => {
    if (!file) return null;

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <h4 className="font-semibold">{file.name}</h4>
              <p className="text-sm text-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <button
            onClick={() => setFile(null)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Remove
          </button>
        </div>
      </div>
    );
  };

  const renderProgressStepper = () => {
    const steps = [
      { name: 'Loading engine', state: 'loading-engine', completed: ['engine-ready', 'scanning', 'triaging', 'complete'].includes(state) },
      { name: 'Scanning locally', state: 'scanning', completed: ['triaging', 'complete'].includes(state) },
      { name: 'AI triage', state: 'triaging', completed: ['complete'].includes(state) },
      { name: 'Report ready', state: 'complete', completed: state === 'complete' },
    ];

    return (
      <div className="space-y-4 mb-8">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
              step.completed ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {step.completed ? <Check className="w-5 h-5" /> : <span className="text-sm">{index + 1}</span>}
            </div>
            <span className={`font-medium ${step.completed ? 'text-gray-700' : 'text-gray-400'}`}>
              {step.name}
            </span>
            {state === step.state && (
              <Loader2 className="w-4 h-4 ml-2 text-blue-600 animate-spin" />
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderErrorState = () => {
    if (!error) return null;

    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-700 mb-2">Scan failed</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={reset}
          className="bg-red-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    );
  };

  const renderReportView = () => {
    if (!result) return null;

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Scan Report</h2>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
              Download HTML
            </button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
              Copy shareable link
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">File Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Filename:</span>
                <span>{result.filename}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <span className={`font-medium ${
                  result.status === 'critical' ? 'text-red-600' :
                  result.status === 'high' ? 'text-orange-600' :
                  result.status === 'medium' ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {result.status.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Scan Time:</span>
                <span>{result.scanTime}ms</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Root Cause</h3>
            <p className="text-sm text-gray-600">{result.finding.rootCause}</p>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="font-semibold text-gray-700 mb-3">Mitigation Strategies</h3>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">IMMEDIATE</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {result.mitigation.immediate.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">CODE LEVEL</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {result.mitigation.codeLevel.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">LONG TERM</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {result.mitigation.longTerm.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={reset}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700"
          >
            Scan another file
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Scan Binary</h1>

        {renderQuotaBar()}

        {state === 'idle' && !file && renderDropZone()}
        {state === 'idle' && file && renderFilePreview()}

        {state === 'idle' && file && (
          <div className="text-center">
            <button
              onClick={handleScanClick}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Scan now
            </button>
          </div>
        )}

        {['loading-engine', 'scanning', 'triaging'].includes(state) && renderProgressStepper()}

        {state === 'error' && renderErrorState()}
        {state === 'complete' && renderReportView()}
      </div>
    </div>
  );
}
